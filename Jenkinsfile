pipeline {
    agent any

    options {
        timeout(time: 30, unit: 'MINUTES')
    }

    environment {
        REGISTRY = "harbor.dhr2333.cn/beancount-trans"
        IMAGE_NAME = "beancount-trans-frontend"
    }

    stages {
        stage('初始化') {
            steps {
                script {
                    echo "🚀 开始构建 Beancount-Trans-Frontend 项目"
                    echo "分支: ${env.BRANCH_NAME}"

                    // 获取Git Commit短哈希
                    env.GIT_COMMIT_SHORT = sh(
                        script: 'git rev-parse --short HEAD',
                        returnStdout: true
                    ).trim()

                    // 设置镜像标签
                    env.IMAGE_TAG = "git-${env.GIT_COMMIT_SHORT}"
                    
                    echo "Git Commit短哈希: ${env.GIT_COMMIT_SHORT}"
                    echo "最终镜像标签: ${env.IMAGE_TAG}"
                    echo "工作目录: ${env.WORKSPACE}"
                }
            }
        }

        stage('配置环境变量') {
            steps {
                writeFile(
                    file: '.env',
                    text: 'VITE_API_URL = "https://trans.dhr2333.cn/api"'
                )
                echo "已更新 .env 文件内容为生产环境配置"
            }
        }

        stage('构建Docker镜像') {
            steps {
                script {
                    docker.build("${env.REGISTRY}/${env.IMAGE_NAME}:${env.IMAGE_TAG}", "--rm .")
                    if (env.BRANCH_NAME == 'main') {
                        sh "docker tag ${env.REGISTRY}/${env.IMAGE_NAME}:${env.IMAGE_TAG} ${env.REGISTRY}/${env.IMAGE_NAME}:latest"
                    }
                }
            }
        }

		stage('部署到服务器') {
		    when {
		        branch 'main'
		    }
		    steps {
		        script {
		            echo "🚀 开始部署到生产服务器..."
		            sshagent([env.SSH_CREDENTIALS_ID]) {
                        sh """
                            ssh -o StrictHostKeyChecking=no -p ${env.DEPLOY_PORT} root@${env.DEPLOY_SERVER} "cd /root/Manage && docker compose -f docker-compose-beancount-trans-frontend.yaml down && sed -i 's|image:.*|image: ${env.REGISTRY}/${env.IMAGE_NAME}:${env.IMAGE_TAG}|' docker-compose-beancount-trans-frontend.yaml && docker compose -f docker-compose-beancount-trans-frontend.yaml up -d"
                        """
		            }
		            echo "✅ 部署完成"
		        }
		    }
		}
    }

    post {
        success {
            script {
                echo '✅ 构建成功'
                if (env.BRANCH_NAME == 'main') {
                    echo "🚀 已部署到生产环境"
                }
            }
        }

        failure {
            echo '❌ 构建失败'
        }

        always {
            cleanWs()
        }
    }
}
