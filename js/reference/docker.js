const DOCKER_CMDS = [
    {
        cat: '容器生命周期',
        items: [
            {cmd: 'docker ps', desc: '运行中的容器'},
            {cmd: 'docker ps -a', desc: '所有容器'},
            {cmd: 'docker run -d --name nginx -p 80:80 nginx', desc: '运行容器'},
            {cmd: 'docker start/stop/restart name', desc: '启停容器'},
            {cmd: 'docker rm name', desc: '删除容器'},
            {cmd: 'docker logs -f name', desc: '查看日志'},
            {cmd: 'docker exec -it name bash', desc: '进入容器'},
            {cmd: 'docker cp src name:/dst', desc: '复制文件到容器'},
        ],
    },
    {
        cat: '镜像',
        items: [
            {cmd: 'docker images', desc: '本地镜像列表'},
            {cmd: 'docker pull nginx:latest', desc: '拉取镜像'},
            {cmd: 'docker build -t myapp:1.0 .', desc: '构建镜像'},
            {cmd: 'docker rmi image', desc: '删除镜像'},
            {cmd: 'docker tag src tgt', desc: '标记镜像'},
            {cmd: 'docker push repo/image:tag', desc: '推送镜像'},
        ],
    },
    {
        cat: 'Docker Compose',
        items: [
            {cmd: 'docker compose up -d', desc: '启动服务'},
            {cmd: 'docker compose down', desc: '停止并删除'},
            {cmd: 'docker compose logs -f', desc: '查看日志'},
            {cmd: 'docker compose ps', desc: '查看服务状态'},
            {cmd: 'docker compose restart', desc: '重启服务'},
            {cmd: 'docker compose pull', desc: '拉取最新镜像'},
        ],
    },
    {
        cat: '系统管理',
        items: [
            {cmd: 'docker info', desc: 'Docker 信息'},
            {cmd: 'docker system df', desc: '磁盘使用'},
            {cmd: 'docker system prune', desc: '清理未使用资源'},
            {cmd: 'docker stats', desc: '容器资源监控'},
            {cmd: 'docker network ls', desc: '网络列表'},
            {cmd: 'docker volume ls', desc: '卷列表'},
        ],
    },
    {
        cat: 'Kubernetes (kubectl)',
        items: [
            {cmd: 'kubectl get pods', desc: '查看 Pod'},
            {cmd: 'kubectl get deployments', desc: '查看 Deployment'},
            {cmd: 'kubectl get services', desc: '查看 Service'},
            {cmd: 'kubectl logs pod-name', desc: 'Pod 日志'},
            {cmd: 'kubectl exec -it pod-name -- bash', desc: '进入 Pod'},
            {cmd: 'kubectl apply -f deploy.yaml', desc: '应用配置'},
            {cmd: 'kubectl delete pod name', desc: '删除 Pod'},
            {cmd: 'kubectl describe pod name', desc: 'Pod 详情'},
            {cmd: 'kubectl port-forward pod 8080:80', desc: '端口转发'},
        ],
    },
];

function dockerRender() {
    const container = document.getElementById('dockerContent');
    if (!container) return;
    container.innerHTML = '';
    DOCKER_CMDS.forEach((group) => {
        const section = document.createElement('div');
        section.style.cssText = 'margin-bottom:16px';
        section.innerHTML = `<div style="font-size:12px;font-weight:600;color:var(--accent);padding:6px 0;border-bottom:1px solid var(--border);margin-bottom:8px">${group.cat}</div>`;
        group.items.forEach((item) => {
            const card = document.createElement('div');
            card.className = 'ref-card';
            card.innerHTML = `<div class="ref-cmd-head"><code class="ref-cmd-name">${item.cmd.replace(/</g, '&lt;')}</code><span class="ref-cmd-desc">${item.desc.replace(/</g, '&lt;')}</span><button class="sm outline" onclick="safeCopy('${item.cmd.replace(/'/g, "\\'")}')">复制</button></div>`;
            section.appendChild(card);
        });
        container.appendChild(section);
    });
}

registerInit('docker', dockerRender);
