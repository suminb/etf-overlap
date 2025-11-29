# Kubernetes Deployment Guide

This guide explains how to deploy the ETF Overlap application to Kubernetes.

## Prerequisites

- Kubernetes cluster (v1.20+)
- `kubectl` CLI configured to access your cluster
- Docker image built and available to your cluster
- At least 3GB of available storage for the database

## Quick Start

### 1. Build and Load Docker Image

First, build the Docker image:

```bash
# Build the image
docker build -t etf-overlap:latest .

# If using Minikube, load the image into Minikube
minikube image load etf-overlap:latest

# If using kind, load the image into kind
kind load docker-image etf-overlap:latest

# If using a remote cluster, push to a registry
docker tag etf-overlap:latest your-registry.com/etf-overlap:latest
docker push your-registry.com/etf-overlap:latest
```

### 2. Update Image Reference (if using a registry)

Edit `k8s/kustomization.yaml` to point to your registry:

```yaml
images:
  - name: etf-overlap
    newName: your-registry.com/etf-overlap
    newTag: latest
```

### 3. Deploy to Kubernetes

Deploy everything with one command:

```bash
kubectl apply -k k8s/
```

### 4. Verify Deployment

Check the status of all resources:

```bash
# Check all resources in the namespace
kubectl get all -n etf-overlap

# Check pods
kubectl get pods -n etf-overlap

# Check services
kubectl get svc -n etf-overlap

# Check persistent volumes
kubectl get pvc -n etf-overlap
```

### 5. Access the Application

**If using LoadBalancer:**

```bash
kubectl get svc etf-overlap-app -n etf-overlap
# Access via the EXTERNAL-IP shown
```

**If LoadBalancer is pending (local clusters):**

Enable port-forward:

```bash
kubectl port-forward -n etf-overlap svc/etf-overlap-app 3000:80
```

Then access at http://localhost:3000

**Or use NodePort** (uncomment the NodePort service in `app-service.yaml`):

```bash
# Get the node IP
kubectl get nodes -o wide

# Access via http://<node-ip>:30080
```

## Architecture

The deployment consists of:

- **Namespace**: `etf-overlap` - Isolated namespace for all resources
- **ConfigMap**: Application configuration (database name, environment variables)
- **Secret**: Sensitive data (database password)
- **PostgreSQL StatefulSet**: Database with persistent storage
- **App Deployment**: Next.js application (2 replicas for high availability)
- **Services**:
  - `postgres`: ClusterIP service for database
  - `etf-overlap-app`: LoadBalancer service for web access
- **PersistentVolumeClaim**: 10Gi storage for PostgreSQL data

## Configuration

### Changing Database Password

**For production, always change the default password!**

Delete the existing secret and create a new one:

```bash
kubectl delete secret etf-overlap-secret -n etf-overlap

kubectl create secret generic etf-overlap-secret \
  -n etf-overlap \
  --from-literal=POSTGRES_PASSWORD='your-secure-password-here'
```

Then restart the pods:

```bash
kubectl rollout restart statefulset/postgres -n etf-overlap
kubectl rollout restart deployment/etf-overlap-app -n etf-overlap
```

### Scaling the Application

Scale the app deployment:

```bash
kubectl scale deployment etf-overlap-app -n etf-overlap --replicas=3
```

### Updating the Application

After building a new image:

```bash
# Update the image tag in kustomization.yaml or deployment
kubectl set image deployment/etf-overlap-app \
  etf-overlap=etf-overlap:v2.0 \
  -n etf-overlap

# Or re-apply with kustomize
kubectl apply -k k8s/
```

### Resource Limits

Current resource allocations:

**PostgreSQL:**

- Requests: 256Mi memory, 250m CPU
- Limits: 512Mi memory, 500m CPU

**App:**

- Requests: 512Mi memory, 250m CPU
- Limits: 2Gi memory, 1 CPU

Adjust these in the deployment files based on your cluster capacity.

## Storage

### Storage Class

By default, the PVC uses the default storage class. To specify a different one:

Edit `k8s/postgres-pvc.yaml`:

```yaml
spec:
  storageClassName: your-storage-class
```

### Increasing Storage

Edit the PVC size in `postgres-pvc.yaml`, then apply:

```bash
kubectl apply -k k8s/
```

Note: Your storage class must support volume expansion.

## Troubleshooting

### Pods not starting

Check pod logs:

```bash
kubectl logs -n etf-overlap deployment/etf-overlap-app
kubectl logs -n etf-overlap statefulset/postgres
```

Describe pods for events:

```bash
kubectl describe pod -n etf-overlap <pod-name>
```

### Database connection issues

Verify database is ready:

```bash
kubectl exec -it -n etf-overlap postgres-0 -- psql -U postgres -c '\l'
```

Check database service:

```bash
kubectl get svc postgres -n etf-overlap
```

### App not accessible

Check service type and external IP:

```bash
kubectl get svc etf-overlap-app -n etf-overlap
```

Check ingress/load balancer provisioning:

```bash
kubectl describe svc etf-overlap-app -n etf-overlap
```

### Chromium/Puppeteer issues

Ensure the pod has enough shared memory:

```bash
kubectl exec -n etf-overlap deployment/etf-overlap-app -- df -h /dev/shm
```

Should show 2Gi available.

Check security context allows SYS_ADMIN capability:

```bash
kubectl get deployment etf-overlap-app -n etf-overlap -o yaml | grep -A 5 securityContext
```

## Monitoring

### View logs

```bash
# App logs
kubectl logs -f -n etf-overlap deployment/etf-overlap-app

# Database logs
kubectl logs -f -n etf-overlap statefulset/postgres

# Logs from all pods
kubectl logs -f -n etf-overlap --all-containers=true
```

### Pod status

```bash
kubectl get pods -n etf-overlap -w
```

### Resource usage

```bash
kubectl top pods -n etf-overlap
kubectl top nodes
```

## Backup and Restore

### Backup Database

```bash
kubectl exec -n etf-overlap postgres-0 -- \
  pg_dump -U postgres etf_overlap > backup.sql
```

### Restore Database

```bash
kubectl exec -i -n etf-overlap postgres-0 -- \
  psql -U postgres etf_overlap < backup.sql
```

## Cleanup

Remove all resources:

```bash
kubectl delete -k k8s/
```

Or delete the namespace (removes everything):

```bash
kubectl delete namespace etf-overlap
```

Note: This will also delete the PersistentVolumeClaim and all data!

## Production Considerations

1. **Security:**
   - Change default passwords
   - Use strong secrets management (e.g., Sealed Secrets, External Secrets Operator)
   - Enable Network Policies
   - Use Pod Security Standards/Admission

2. **High Availability:**
   - Use multiple replicas for the app
   - Consider PostgreSQL replication/HA (e.g., Patroni, Stolon)
   - Spread pods across multiple nodes with pod anti-affinity

3. **Monitoring:**
   - Add Prometheus metrics
   - Set up Grafana dashboards
   - Configure alerting

4. **Ingress:**
   - Use Ingress controller instead of LoadBalancer
   - Enable TLS/SSL with cert-manager
   - Configure domain names

5. **Resource Management:**
   - Set appropriate resource requests/limits
   - Use Horizontal Pod Autoscaler (HPA)
   - Configure PodDisruptionBudgets

6. **Storage:**
   - Use production-grade storage class
   - Enable volume snapshots
   - Set up automated backups

## Advanced: Using Helm (Optional)

To package this as a Helm chart for easier management, consider converting the manifests to a Helm chart structure. This would allow parameterized deployments across different environments.

## CI/CD Integration

Example GitHub Actions workflow:

```yaml
- name: Build and push Docker image
  run: |
    docker build -t registry.example.com/etf-overlap:${{ github.sha }} .
    docker push registry.example.com/etf-overlap:${{ github.sha }}

- name: Deploy to Kubernetes
  run: |
    cd k8s
    kustomize edit set image etf-overlap=registry.example.com/etf-overlap:${{ github.sha }}
    kubectl apply -k .
```
