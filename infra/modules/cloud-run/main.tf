# Cloud Run module for otel-genai-semconv

variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "service_name" {
  description = "Cloud Run service name"
  type        = string
  default     = "otel-genai-semconv"
}

variable "region" {
  description = "GCP region"
  type        = string
  default     = "us-central1"
}

variable "image" {
  description = "Container image URL"
  type        = string
}

variable "min_instances" {
  description = "Minimum instances (0 for scale to zero)"
  type        = number
  default     = 0
}

variable "max_instances" {
  description = "Maximum instances"
  type        = number
  default     = 10
}

variable "memory" {
  description = "Memory in Mi"
  type        = number
  default     = 512
}

variable "cpu" {
  description = "CPU allocation"
  type        = number
  default     = 1
}

variable "timeout" {
  description = "Request timeout in seconds"
  type        = number
  default     = 60
}

variable "environment_variables" {
  description = "Environment variables"
  type        = map(string)
  default     = {}
}

variable "secrets" {
  description = "Secret environment variables (from Secret Manager)"
  type        = map(string)
  default     = {}
}

resource "google_cloud_run_v2_service" "this" {
  name     = var.service_name
  location = var.region
  project  = var.project_id

  template {
    max_instance_request_concurrency = 80
    scaling {
      min_instance_count = var.min_instances
      max_instance_count = var.max_instances
    }

    containers {
      image = var.image

      resources {
        limits = {
          memory = "${var.memory}Mi"
          cpu    = var.cpu
        }
      }

      env {
        name  = "OTEL_SERVICE_NAME"
        value = var.service_name
      }

      env {
        name  = "OTEL_TRACES_EXPORTER"
        value = "otlp"
      }

      env {
        name  = "OTEL_EXPORTER_OTLP_ENDPOINT"
        value = "http://localhost:4318"
      }

      dynamic "env" {
        for_each = var.environment_variables
        content {
          name  = env.key
          value = env.value
        }
      }

      dynamic "env" {
        for_each = var.secrets
        content {
          name = env.key
          value_source {
            secret_key_ref {
              secret  = env.value
              version = "latest"
            }
          }
        }
      }
    }
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_SERVE_LATEST"
    percent = 100
  }
}

output "service_url" {
  description = "Cloud Run service URL"
  value       = google_cloud_run_v2_service.this.uri
}

output "service_name" {
  description = "Cloud Run service name"
  value       = google_cloud_run_v2_service.this.name
}
