variable "pm_api_url" {
  type = string
}

variable "pm_username" {
  type = string
}

variable "pm_password" {
  type      = string
  sensitive = true
}

variable "node_name" {
  type = string
}

variable "template_vm_id" {
  type = number
}

variable "datastore_files" {
  type    = string
  default = "local"
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