pipeline {
    agent any

    environment {
        // AWS Credentials should be injected via Jenkins Credentials Plugin
        AWS_ACCESS_KEY_ID     = credentials('AWS_ACCESS_KEY_ID')
        AWS_SECRET_ACCESS_KEY = credentials('AWS_SECRET_ACCESS_KEY')
        AWS_REGION            = 'ap-south-1' // Adjust as needed
        
        // Docker Hub / Registry credentials
        DOCKER_CREDS          = credentials('DOCKER_HUB_CREDS')
        
        BACKEND_IMAGE         = "ghcr.io/YOUR_ORG/aura-saas-backend:${env.BUILD_ID}"
        FRONTEND_IMAGE        = "ghcr.io/YOUR_ORG/aura-saas-frontend:${env.BUILD_ID}"
    }

    stages {
        stage('Lint & Security Scan') {
            steps {
                echo 'Running Trivy security scanner and ESLint...'
                // Add linting logic here
            }
        }

        stage('Provision Infrastructure (Terraform)') {
            steps {
                dir('terraform') {
                    sh 'terraform init'
                    sh 'terraform apply -auto-approve'
                }
            }
        }

        stage('Build & Push Docker Images') {
            steps {
                echo 'Building Backend...'
                sh "docker build -f docker/Dockerfile.backend -t ${BACKEND_IMAGE} ."
                
                echo 'Building Frontend...'
                sh "docker build -f docker/Dockerfile.frontend -t ${FRONTEND_IMAGE} ."
                
                echo 'Pushing Images to Registry...'
                // sh "echo \$DOCKER_CREDS_PSW | docker login -u \$DOCKER_CREDS_USR --password-stdin"
                // sh "docker push ${BACKEND_IMAGE}"
                // sh "docker push ${FRONTEND_IMAGE}"
            }
        }

        stage('Deploy to Kubernetes (Helm)') {
            steps {
                echo 'Fetching Kubeconfig from Terraform...'
                dir('terraform') {
                    // Extract kubeconfig from terraform output or SSH to the master node to run helm
                    sh 'terraform output -raw EC2_PUBLIC_IP > ec2_ip.txt'
                }
                
                echo 'Deploying via Helm over SSH...'
                script {
                    def ec2Ip = readFile('terraform/ec2_ip.txt').trim()
                    
                    // In a real Jenkins setup, use the SSH Agent plugin
                    sh """
                    ssh -o StrictHostKeyChecking=no ubuntu@${ec2Ip} '
                        helm upgrade --install aura-saas ./helm/aura-saas \\
                        --set backend.image.repository=ghcr.io/YOUR_ORG/aura-saas-backend \\
                        --set backend.image.tag=${env.BUILD_ID} \\
                        --set frontend.image.repository=ghcr.io/YOUR_ORG/aura-saas-frontend \\
                        --set frontend.image.tag=${env.BUILD_ID}
                    '
                    """
                }
            }
        }
    }

    post {
        always {
            echo 'Pipeline completed.'
        }
        success {
            echo 'Deployment Successful!'
        }
        failure {
            echo 'Deployment Failed. Check the logs.'
        }
    }
}
