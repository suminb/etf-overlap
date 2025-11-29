# Kubernetes Deployment Guide

This guide explains how to deploy the ETF Overlap application to Kubernetes.

## Prerequisites

- Kubernetes cluster (v1.20+)
- `kubectl` CLI configured to access your cluster
- Docker image built and available to your cluster

## Quick Start

### 1. Build and Load Docker Image

First, build the Docker image with ETF data included:

```bash
# Scrape ETF data first (if not already done)
npm run scrape QQQ SPY VTI  # Or any ETFs you want to include

# Build the image (data files will be included)
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
- **App Deployment**: Next.js application (2 replicas for high availability)
- **Service**: LoadBalancer service for web access

## Configuration

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

### Updating ETF Data

To update ETF holdings data:

1. Run the scraper locally:
   ```bash
   npm run scrape QQQ SPY VTI  # Update specific ETFs
   # or
   npm run scrape --all        # Update all ETFs
   ```

2. Commit the updated data files:
   ```bash
   git add data/
   git commit -m "Update ETF holdings data"
   ```

3. Rebuild and redeploy:
   ```bash
   docker build -t etf-overlap:v2.0 .
   kubectl set image deployment/etf-overlap-app etf-overlap=etf-overlap:v2.0 -n etf-overlap
   ```

### Resource Limits

Current resource allocations:

**App:**

- Requests: 512Mi memory, 250m CPU
- Limits: 2Gi memory, 1 CPU

Adjust these in `k8s/app-deployment.yaml` based on your cluster capacity and ETF data size.

## Troubleshooting

### Pods not starting

Check pod logs:

```bash
kubectl logs -n etf-overlap deployment/etf-overlap-app
```

Describe pods for events:

```bash
kubectl describe pod -n etf-overlap <pod-name>
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

### ETF data not found

Ensure data files were included in the Docker image:

```bash
kubectl exec -n etf-overlap deployment/etf-overlap-app -- ls -la data/etfs/
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

## Cleanup

Remove all resources:

```bash
kubectl delete -k k8s/
```

Or delete the namespace (removes everything):

```bash
kubectl delete namespace etf-overlap
```

## Production Considerations

1. **Security:**
   - Enable Network Policies
   - Use Pod Security Standards/Admission
   - Consider read-only root filesystem

2. **High Availability:**
   - Use multiple replicas for the app (already configured: 2 replicas)
   - Spread pods across multiple nodes with pod anti-affinity
   - Configure PodDisruptionBudgets

3. **Monitoring:**
   - Add Prometheus metrics
   - Set up Grafana dashboards
   - Configure alerting

4. **Ingress:**
   - Use Ingress controller instead of LoadBalancer
   - Enable TLS/SSL with cert-manager
   - Configure domain names

5. **Resource Management:**
   - Set appropriate resource requests/limits based on data size
   - Use Horizontal Pod Autoscaler (HPA)
   - Monitor memory usage as data grows

6. **Data Updates:**
   - Set up automated scraping jobs (CronJob)
   - Implement CI/CD pipeline for data updates
   - Consider blue-green deployments for zero-downtime updates

## CI/CD Integration

Example GitHub Actions workflow:

```yaml
- name: Scrape ETF data
  run: |
    npm install
    npm run scrape --all

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

## Scheduled Data Updates (Optional)

Create a CronJob to periodically scrape and update data:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: etf-data-scraper
  namespace: etf-overlap
spec:
  schedule: "0 0 * * 0"  # Weekly on Sunday
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: scraper
            image: etf-overlap:latest
            command: ["npm", "run", "scrape", "--all"]
          restartPolicy: OnFailure
```

Note: This would require additional setup to rebuild and redeploy the app with updated data.
