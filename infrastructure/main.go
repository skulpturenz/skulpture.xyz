package main

import (
	"fmt"

	"github.com/dogmatiq/ferrite"
	"github.com/pulumi/pulumi-cloudflare/sdk/v5/go/cloudflare"
	"github.com/pulumi/pulumi-gcp/sdk/v7/go/gcp/compute"
	"github.com/pulumi/pulumi-gcp/sdk/v7/go/gcp/iam"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
)

var (
	COMPUTE_INSTANCE_NAME = ferrite.
				String("COMPUTE_INSTANCE_NAME", "Unique name for compute instance").
				Required()
	GOOGLE_PROJECT = ferrite.
			String("GOOGLE_PROJECT", "GCP Project").
			Required()
	GOOGLE_SERVICE_ACCOUNT = ferrite.
				String("GOOGLE_SERVICE_ACCOUNT", "Service account linked to vm").
				Required()
	CLOUDFLARE_ZONE_ID = ferrite.
				String("CLOUDFLARE_ZONE_ID", "Cloudflare zone id").
				Required()
	CLOUDFLARE_API_TOKEN = ferrite.
				String("CLOUDFLARE_API_TOKEN", "Cloudflare API token").
				Required()
	GCP_SSH_PUBLIC_KEY = ferrite.
				String("GCP_SSH_PUBLIC_KEY", "SSH key for this instance").
				Required()
)

func main() {
	pulumi.Run(func(ctx *pulumi.Context) error {
		static, err := compute.NewAddress(ctx, COMPUTE_INSTANCE_NAME.Value(), &compute.AddressArgs{
			Name:   pulumi.String(COMPUTE_INSTANCE_NAME.Value()),
			Region: pulumi.String("australia-southeast1"),
		})
		if err != nil {
			return err
		}

		instance, err := compute.NewInstance(ctx, COMPUTE_INSTANCE_NAME.Value(), &compute.InstanceArgs{
			Name:        pulumi.String(COMPUTE_INSTANCE_NAME.Value()),
			MachineType: pulumi.String("e2-micro"),
			Zone:        pulumi.String("australia-southeast1-c"),
			Tags: pulumi.ToStringArray([]string{
				"allow-cloudflare",
				"allow-ssh",
			}),
			NetworkInterfaces: compute.InstanceNetworkInterfaceArray{
				&compute.InstanceNetworkInterfaceArgs{
					AccessConfigs: compute.InstanceNetworkInterfaceAccessConfigArray{
						&compute.InstanceNetworkInterfaceAccessConfigArgs{
							NatIp: static.Address,
						},
					},
					Network: pulumi.String("shared-resources-network"),
				},
			},
			Metadata: pulumi.ToStringMap(map[string]string{
				"ssh-keys": GCP_SSH_PUBLIC_KEY.Value(),
			}),
			// Docker setup on Debian 12: https://www.thomas-krenn.com/en/wiki/Docker_installation_on_Debian_12
			// Permanently increase vm.max_map_count value: https://thetechdarts.com/how-to-change-default-vm-max_map_count-on-linux/
			MetadataStartupScript: pulumi.String(fmt.Sprintf(`#! /bin/bash 
				curl -sSO https://dl.google.com/cloudagents/add-google-cloud-ops-agent-repo.sh
				sudo bash add-google-cloud-ops-agent-repo.sh --also-install

				sudo apt update &&
				sudo apt install certbot python3-certbot-dns-cloudflare make git ca-certificates curl gnupg apt-transport-https gpg -y &&
				curl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker.gpg &&
				echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker.gpg] https://download.docker.com/linux/debian bookworm stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null &&
				sudo apt update &&
				sudo apt install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin docker-compose -y &&
				sudo grep -qxF 'vm.max_map_count=262144' /etc/sysctl.conf || echo vm.max_map_count=262144 | sudo tee -a /etc/sysctl.conf &&
				sudo sysctl -p &&
				sudo mkdir -p /etc/letsencrypt/renewal-hooks/deploy && 
				echo "dns_cloudflare_api_token = %s" | sudo tee /etc/letsencrypt/dnscloudflare.ini &&
				echo "#! /bin/bash sudo docker service ls -q | xargs -n1 sudo docker service update --force" | sudo tee /etc/letsencrypt/renewal-hooks/deploy/reload-services.sh &&
				sudo chmod 0600 /etc/letsencrypt/dnscloudflare.ini &&
				sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/reload-services.sh &&
				sudo chmod 0600 /etc/letsencrypt/renewal-hooks/deploy/reload-services.sh &&
				sudo certbot certonly -d dev.skulpture.xyz,skulpture.xyz \
					--dns-cloudflare --dns-cloudflare-credentials /etc/letsencrypt/dnscloudflare.ini \
					--non-interactive --agree-tos \
					--register-unsafely-without-email \
					--dns-cloudflare-propagation-seconds 60`, CLOUDFLARE_API_TOKEN.Value())),
			Scheduling: compute.InstanceSchedulingArgs{
				AutomaticRestart:  pulumi.Bool(true),
				OnHostMaintenance: pulumi.String("MIGRATE"),
			},
			DeletionProtection:     pulumi.Bool(false),
			AllowStoppingForUpdate: pulumi.Bool(true),
			BootDisk: &compute.InstanceBootDiskArgs{
				InitializeParams: &compute.InstanceBootDiskInitializeParamsArgs{
					Image: pulumi.String("debian-12-bookworm-v20240515"),
					Type:  pulumi.String("pd-standard"),
					Size:  pulumi.Int(25),
				},
				AutoDelete: pulumi.Bool(false),
			},
			ServiceAccount: compute.InstanceServiceAccountArgs{
				Email: pulumi.StringPtr(GOOGLE_SERVICE_ACCOUNT.Value()),
				Scopes: pulumi.ToStringArray([]string{
					"cloud-platform",
					"https://www.googleapis.com/auth/drive",
					"https://www.googleapis.com/auth/spreadsheets",
				}),
			},
		})
		if err != nil {
			return err
		}

		ctx.Export("uri", instance.SelfLink)
		ctx.Export("status", instance.CurrentStatus)
		ctx.Export("id", instance.ID())
		ctx.Export("instanceId", instance.InstanceId)
		ctx.Export("staticAddress", static.Address)

		_, err = cloudflare.NewRecord(ctx, COMPUTE_INSTANCE_NAME.Value(), &cloudflare.RecordArgs{
			ZoneId:  pulumi.String(CLOUDFLARE_ZONE_ID.Value()),
			Name:    pulumi.String("landing-api-master"),
			Content: static.Address,
			Type:    pulumi.String("A"),
			Proxied: pulumi.Bool(true),
		})
		if err != nil {
			return err
		}

		_, err = cloudflare.NewRecord(ctx, fmt.Sprintf("%s-client", COMPUTE_INSTANCE_NAME.Value()), &cloudflare.RecordArgs{
			ZoneId:  pulumi.String(CLOUDFLARE_ZONE_ID.Value()),
			Name:    pulumi.String("@"),
			Content: pulumi.String("skulpture-xyz.pages.dev"),
			Type:    pulumi.String("CNAME"),
			Proxied: pulumi.Bool(true),
		})
		if err != nil {
			return err
		}

		_, err = cloudflare.NewRecord(ctx, fmt.Sprintf("%s-dev", COMPUTE_INSTANCE_NAME.Value()), &cloudflare.RecordArgs{
			ZoneId:  pulumi.String(CLOUDFLARE_ZONE_ID.Value()),
			Name:    pulumi.String("landing-api-dev"),
			Content: static.Address,
			Type:    pulumi.String("A"),
			Proxied: pulumi.Bool(true),
		})
		if err != nil {
			return err
		}

		_, err = cloudflare.NewRecord(ctx, fmt.Sprintf("%s-client-dev", COMPUTE_INSTANCE_NAME.Value()), &cloudflare.RecordArgs{
			ZoneId: pulumi.String(CLOUDFLARE_ZONE_ID.Value()),
			Name:   pulumi.String("dev"),
			// https://developers.cloudflare.com/pages/how-to/custom-branch-aliases/
			Content: pulumi.String("dev.skulpture-xyz.pages.dev"),
			Type:    pulumi.String("CNAME"),
			Proxied: pulumi.Bool(true),
		})
		if err != nil {
			return err
		}

		pool, err := iam.LookupWorkloadIdentityPool(ctx, &iam.LookupWorkloadIdentityPoolArgs{
			WorkloadIdentityPoolId: "shared-resources",
		})
		if err != nil {
			return err
		}

		const REPOSITORY = "skulpturenz/skulpture.xyz"
		principalSet := fmt.Sprintf("principalSet://iam.googleapis.com/%s/attribute.repository/%s", pool.Name, REPOSITORY)

		instance.InstanceId.ApplyT(func(instanceId string) error {
			_, err = compute.NewInstanceIAMBinding(ctx, fmt.Sprintf("%s-compute-admin", COMPUTE_INSTANCE_NAME.Value()), &compute.InstanceIAMBindingArgs{
				Zone:         pulumi.String("australia-southeast1-c"),
				InstanceName: pulumi.String(COMPUTE_INSTANCE_NAME.Value()),
				Role:         pulumi.String("roles/compute.admin"),
				Members:      pulumi.ToStringArray([]string{principalSet}),
			})
			if err != nil {
				return err
			}

			return nil
		})

		return nil
	})
}
