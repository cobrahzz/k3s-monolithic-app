variable "pm_api_url" {
  type = string
}

variable "pm_token_id" {
  type = string
}

variable "pm_token_secret" {
  type      = string
  sensitive = true
}

variable "node_name" {
  type = string
}

variable "template_vm_id" {
  type = number
}

variable "datastore_disks" {
  type    = string
  default = "local-lvm"
}

variable "bridge" {
  type    = string
  default = "vmbr0"
}

variable "ssh_pubkey" {
  type = string
}

variable "ci_user" {
  type    = string
  default = "remi"
}

variable "gateway" {
  type    = string
  default = "192.168.1.254"
}

variable "server_ip" {
  type    = string
  default = "192.168.1.50/24"
}

variable "agent_ips" {
  type    = list(string)
  default = ["192.168.1.60/24", "192.168.1.61/24"]
}
