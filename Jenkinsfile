pipeline {
    agent any
    environment {
        DOCKER_TAG = '20240405'
        DOCKER_IMAGE = 'registry.cn-hangzhou.aliyuncs.com/dhr2333/beancount-trans-frontend'
        YAML = "image: ${DOCKER_IMAGE}:${DOCKER_TAG}"
    }
    stages {
        stage('Clone') {
            steps {
                git branch: 'main', credentialsId: '0bd011d1-722c-4a1a-a870-31eaff32761d', url: 'https://github.com/dhr2333/Beancount-Trans-Frontend.git'
            }
        }
        stage('Modify Configuration'){
            steps {
                sh '''sed -i \'s/^# VITE_API_URL = "https:\\/\\/trans.dhr2333.cn\\/api"/VITE_API_URL = "https:\\/\\/trans.dhr2333.cn\\/api"/\' .env\nsed -i \'s/^VITE_API_URL = "http:\\/\\/localhost:38001\\/api"/# VITE_API_URL = "http:\\/\\/localhost:38001\\/api"/\' .env\ncat .env'''
            }
        }
//         stage('Src Build'){
//             steps {
//                 nodejs('NodeJs 20.3.0') {
//                     // some block
//                 }
//                 sh '''PACKAGE=\'beancount-trans-vue.tar.gz\'
// node -v
// npm -v
// npm install
// npm run build
// cd dist
// rm -rf $PACKAGE
// tar zcvf $PACKAGE	*
// cd ..'''
//             }
//         }
//         stage('Build Image and Push') {
//             steps {
//                 sshPublisher(publishers: [sshPublisherDesc(configName: 'dhr2333', transfers: [sshTransfer(cleanRemote: false, excludes: '', execCommand: '''PACKAGE=\'beancount-trans-vue.tar.gz\'
// IMAGE_NAME=\'harbor.dhr2333.cn:8080/library/beancount-trans:20230614\'

// rm /usr/local/daihaorui/jenkins/Beancount-Trans-Frontend/dist/*
// mv /usr/local/daihaorui/jenkins/Beancount-Trans-Fronten/beancount-trans-vue.tar.gz /usr/local/daihaorui/jenkins/Beancount-Trans-Frontend/dist/
// cd /usr/local/daihaorui/jenkins/Beancount-Trans-Frontend/dist/
// tar zxvf $PACKAGE
// rm -rf $PACKAGE
// cd ..
// docker build -t $IMAGE_NAME .
// # docker push $IMAGE_NAME''', execTimeout: 120000, flatten: false, makeEmptyDirs: false, noDefaultExcludes: false, patternSeparator: '[, ]+', remoteDirectory: '/Beancount-Trans-Fronten', remoteDirectorySDF: false, removePrefix: 'dist/', sourceFiles: 'dist/beancount-trans-vue.tar.gz')], usePromotionTimestamp: false, useWorkspaceInPromotion: false, verbose: true)])
//                 // script {
//                 //     docker.withRegistry('http://127.0.0.1:8080', 'a4a1bb2f-ee2a-4476-bc0f-f0b8df584cd1') {
//                 //         def customImage = docker.build("127.0.0.1:8080/library/beancount-trans-frontend:latest")
//                 //         customImage.push()
//                 //     }
//                 // }
//             }
//         }
         stage('Build Image and Push') {
            steps {
                script {
                    docker.withRegistry('https://registry.cn-hangzhou.aliyuncs.com/dhr2333', '8972f1d0-8506-4197-9ffa-88f6f988650a') {
                        def customImage = docker.build("${DOCKER_IMAGE}:${DOCKER_TAG}")
                        customImage.push()
                    }
                }
            }
        }
        stage('Start Service'){
            steps{
                sshPublisher(publishers: [sshPublisherDesc(configName: 'dhr2333', transfers: [sshTransfer(cleanRemote: false, excludes: '', execCommand: "echo ${DOCKER_TAG} \n echo \"${DOCKER_TAG}\" \n sed -i \"/registry.cn-hangzhou.aliyuncs.com\\/dhr2333\\/beancount-trans-frontend/c\\\\    image: registry.cn-hangzhou.aliyuncs.com/dhr2333/beancount-trans-frontend:${DOCKER_TAG}\" /root/Manage/docker-compose-beancount-trans.yaml \n docker compose -f /root/Manage/docker-compose-beancount-trans.yaml down \n docker compose -f /root/Manage/docker-compose-beancount-trans.yaml up -d", execTimeout: 120000, flatten: false, makeEmptyDirs: false, noDefaultExcludes: false, patternSeparator: '[, ]+', remoteDirectory: '', remoteDirectorySDF: false, removePrefix: '', sourceFiles: '')], usePromotionTimestamp: false, useWorkspaceInPromotion: false, verbose: false)])
            }
        }
    }
    post {  // 不管构建结果，都执行以下步骤
        success{  // 构建成功时
            echo 'hello'

        }
        failure{
            echo 'hello'
        }
    }
}