# Production environment

terraform {
  required_version = ">= 1.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "GCP region"
  type        = string
  default     = "us-central1"
}

variable "docker_image" {
  description = "Docker image URL"
  type        = string
}

provider "google" {
  project = var.project_id
  region  = var.region
}

module "cloud_run" {
  source = "../../modules/cloud-run"

  project_id   = var.project_id
  service_name = "otel-genai-semconv-prod"
  region       = var.region
  image        = var.docker_image

  min_instances = 1
  max_instances = 20
  memory        = 512
  cpu           = 1
  timeout       = 60

  environment_variables = {
    LOG_LEVEL = "info"
    ENV       = "prod"
  }

  secrets = {
    OPENAI_API_KEY    = "otel-genai-semconv-openai-api-key"
    ANTHROPIC_API_KEY = "otel-genai-semconv-anthropic-api-key"
  }
}

output "service_url" {
  value = module.cloud_run.service_url
}
