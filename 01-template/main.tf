terraform {
  required_providers {
    proxmox = {
      source  = "bpg/proxmox"
      version = ">= 0.7.0"
    }
  }
}

provider "proxmox" {
  endpoint = var.pm_api_url
  username = var.pm_username
  password = var.pm_password
  insecure = true
}

# Télécharge une cloud image Debian (QCOW2) sur le datastore "local"
resource "proxmox_virtual_environment_download_file" "debian_cloud" {
  content_type = "import"
  datastore_id = var.datastore_files
  node_name    = var.node_name

  # cdimage.debian.org redirige (302) et Proxmox ne suit pas les redirects.
  # URL du miroir direct résolu via : curl -ILs <url_officielle> | grep Location
  url       = "https://chuangtzu.ftp.acc.umu.se/cdimage/cloud/bookworm/latest/debian-12-genericcloud-amd64.qcow2"
  file_name = "debian-12-genericcloud-amd64.qcow2"
}

resource "proxmox_virtual_environment_vm" "debian_template" {
  name        = "debian-12-ci-template"
  description = "Base template for K3s (cloud-init). Managed by Terraform."
  node_name   = var.node_name
  vm_id       = var.template_vm_id
  template    = true

  agent {
    enabled = false
  }
  stop_on_destroy = true

  cpu {
    cores = 2
    type  = "x86-64-v2-AES"
  }

  memory {
    dedicated = 2048
  }

  disk {
    datastore_id = var.datastore_disks
    interface    = "scsi0"
    import_from  = proxmox_virtual_environment_download_file.debian_cloud.id
    size         = 20
  }

  initialization {
    ip_config {
      ipv4 { address = "dhcp" }
    }
    user_account {
      username = var.ci_user
      keys     = [trimspace(var.ssh_pubkey)]
    }
  }

  network_device { bridge = var.bridge }
  operating_system { type = "l26" }
  serial_device {}
}