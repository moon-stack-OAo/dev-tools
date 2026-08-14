// Kubernetes 速查 — 数据 + RefEngine 挂载

const K8SREF_DATA = [
    {
        cat: '集群信息',
        items: [
            {
                cmd: 'kubectl cluster-info',
                desc: '查看集群控制面与核心服务地址',
                examples: ['kubectl cluster-info dump'],
            },
            {
                cmd: 'kubectl get nodes',
                desc: '列出节点',
                examples: ['kubectl get nodes -o wide', 'kubectl describe node <node>'],
            },
            {
                cmd: 'kubectl get componentstatuses',
                desc: '组件健康（部分版本已弃用）',
                examples: ['kubectl get cs'],
            },
            {
                cmd: 'kubectl api-resources',
                desc: '列出 API 资源类型',
                examples: ['kubectl api-resources --namespaced=true', 'kubectl api-versions'],
            },
            {
                cmd: 'kubectl version',
                desc: '客户端 / 服务端版本',
                examples: ['kubectl version --short', 'kubectl version -o yaml'],
            },
            {
                cmd: 'kubectl top nodes',
                desc: '节点 CPU/内存（需 metrics-server）',
                examples: ['kubectl top pods -A'],
            },
        ],
    },
    {
        cat: 'Pod',
        items: [
            {
                cmd: 'kubectl get pods',
                desc: '列出当前命名空间 Pod',
                examples: ['kubectl get pods -A', 'kubectl get pods -o wide', 'kubectl get pods -l app=web'],
            },
            {
                cmd: 'kubectl describe pod <name>',
                desc: 'Pod 详情与事件',
                examples: ['kubectl describe po <name> -n <ns>'],
            },
            {
                cmd: 'kubectl delete pod <name>',
                desc: '删除 Pod（控制器会重建）',
                examples: ['kubectl delete pod <name> --grace-period=0 --force'],
            },
            {
                cmd: 'kubectl exec -it <pod> -- bash',
                desc: '进入容器交互 shell',
                examples: ['kubectl exec -it <pod> -c <container> -- sh', 'kubectl exec <pod> -- ls /'],
            },
            {
                cmd: 'kubectl port-forward pod/<pod> 8080:80',
                desc: '本地端口转发到 Pod',
                examples: ['kubectl port-forward svc/my-svc 8080:80', 'kubectl port-forward deploy/web 8080:80'],
            },
            {
                cmd: 'kubectl cp <pod>:/path ./local',
                desc: '与 Pod 互拷文件',
                examples: ['kubectl cp ./file <pod>:/tmp/file', 'kubectl cp <pod>:/var/log/a.log ./a.log -c <c>'],
            },
            {
                cmd: 'kubectl get pod <name> -o yaml',
                desc: '导出 Pod YAML',
                examples: ['kubectl get po <name> -o jsonpath="{.status.podIP}"'],
            },
            {
                cmd: 'kubectl run debug --rm -it --image=busybox -- sh',
                desc: '临时调试 Pod',
                examples: ['kubectl debug -it <pod> --image=busybox --target=<container>'],
            },
        ],
    },
    {
        cat: 'Deployment',
        items: [
            {
                cmd: 'kubectl get deployments',
                desc: '列出 Deployment',
                examples: ['kubectl get deploy -o wide', 'kubectl get deploy -A'],
            },
            {
                cmd: 'kubectl create deployment web --image=nginx',
                desc: '快速创建 Deployment',
                examples: ['kubectl create deploy web --image=nginx --replicas=3'],
            },
            {
                cmd: 'kubectl apply -f deploy.yaml',
                desc: '声明式应用配置',
                examples: ['kubectl apply -f ./manifests/', 'kubectl apply -k ./overlays/prod'],
            },
            {
                cmd: 'kubectl scale deploy/<name> --replicas=3',
                desc: '调整副本数',
                examples: ['kubectl scale deploy web --replicas=0'],
            },
            {
                cmd: 'kubectl rollout status deploy/<name>',
                desc: '查看滚动更新状态',
                examples: [
                    'kubectl rollout history deploy/<name>',
                    'kubectl rollout undo deploy/<name>',
                    'kubectl rollout undo deploy/<name> --to-revision=2',
                ],
            },
            {
                cmd: 'kubectl set image deploy/<name> <c>=img:tag',
                desc: '更新容器镜像',
                examples: ['kubectl set image deploy/web web=nginx:1.25', 'kubectl set env deploy/web FOO=bar'],
            },
            {
                cmd: 'kubectl edit deploy/<name>',
                desc: '在线编辑资源',
                examples: ['kubectl edit deploy/<name> -o yaml'],
            },
            {
                cmd: 'kubectl delete deploy/<name>',
                desc: '删除 Deployment 及其 Pod',
                examples: ['kubectl delete -f deploy.yaml'],
            },
        ],
    },
    {
        cat: 'Service',
        items: [
            {
                cmd: 'kubectl get services',
                desc: '列出 Service',
                examples: ['kubectl get svc -o wide', 'kubectl get svc -A'],
            },
            {
                cmd: 'kubectl expose deploy/web --port=80 --type=ClusterIP',
                desc: '为工作负载创建 Service',
                examples: [
                    'kubectl expose deploy/web --port=80 --type=NodePort',
                    'kubectl expose pod/<pod> --port=8080 --name=tmp-svc',
                ],
            },
            {
                cmd: 'kubectl describe svc <name>',
                desc: 'Service 详情与 Endpoints',
                examples: ['kubectl get endpoints <name>'],
            },
            {
                cmd: 'kubectl get ingress',
                desc: '列出 Ingress',
                examples: ['kubectl describe ingress <name>', 'kubectl get ing -A'],
            },
            {
                cmd: 'kubectl apply -f svc.yaml',
                desc: '应用 Service 清单',
                examples: ['kubectl delete svc <name>'],
            },
            {
                cmd: 'kubectl get endpointslices',
                desc: '查看 EndpointSlice（新版）',
                examples: ['kubectl get endpointslices -l kubernetes.io/service-name=<svc>'],
            },
        ],
    },
    {
        cat: 'ConfigMap / Secret',
        items: [
            {
                cmd: 'kubectl create configmap <name> --from-literal=k=v',
                desc: '从字面量创建 ConfigMap',
                examples: [
                    'kubectl create cm app-cfg --from-file=./config/',
                    'kubectl create cm app-cfg --from-env-file=.env',
                ],
            },
            {
                cmd: 'kubectl create secret generic <name> --from-literal=pwd=xxx',
                desc: '创建通用 Secret',
                examples: [
                    'kubectl create secret docker-registry regcred --docker-server=... --docker-username=... --docker-password=...',
                    'kubectl create secret tls tls-secret --cert=tls.crt --key=tls.key',
                ],
            },
            {
                cmd: 'kubectl get configmaps',
                desc: '列出 ConfigMap',
                examples: ['kubectl get cm', 'kubectl describe cm <name>'],
            },
            {
                cmd: 'kubectl get secrets',
                desc: '列出 Secret（data 为 base64）',
                examples: ['kubectl get secret <name> -o yaml', 'kubectl get secret <name> -o jsonpath="{.data.pwd}" | base64 -d'],
            },
            {
                cmd: 'kubectl apply -f cm.yaml',
                desc: '声明式更新配置',
                examples: ['kubectl edit cm <name>', 'kubectl delete cm <name>'],
            },
            {
                cmd: 'kubectl set env deploy/<d> --from=configmap/<cm>',
                desc: '从 CM/Secret 注入环境变量',
                examples: ['kubectl set env deploy/web --from=secret/db-secret'],
            },
        ],
    },
    {
        cat: '日志与调试',
        items: [
            {
                cmd: 'kubectl logs <pod>',
                desc: '查看 Pod 日志',
                examples: [
                    'kubectl logs -f <pod>',
                    'kubectl logs <pod> -c <container>',
                    'kubectl logs <pod> --previous',
                    'kubectl logs -l app=web --tail=100',
                ],
            },
            {
                cmd: 'kubectl logs deploy/<name>',
                desc: '按工作负载取日志（选一个 Pod）',
                examples: ['kubectl logs -f deploy/web', 'kubectl logs job/<name>'],
            },
            {
                cmd: 'kubectl describe <resource> <name>',
                desc: '资源详情 + Events',
                examples: ['kubectl describe pod <name>', 'kubectl get events --sort-by=.lastTimestamp'],
            },
            {
                cmd: 'kubectl get events',
                desc: '命名空间事件',
                examples: ['kubectl get events -A --field-selector type=Warning'],
            },
            {
                cmd: 'kubectl top pods',
                desc: 'Pod 资源使用',
                examples: ['kubectl top pods -n <ns> --containers'],
            },
            {
                cmd: 'kubectl auth can-i',
                desc: '检查 RBAC 权限',
                examples: ['kubectl auth can-i create pods', 'kubectl auth can-i "*" "*" --as=system:serviceaccount:ns:sa'],
            },
            {
                cmd: 'kubectl get all',
                desc: '常见工作负载一览（非全部资源）',
                examples: ['kubectl get all -n <ns>', 'kubectl get all -l app=web'],
            },
        ],
    },
    {
        cat: '上下文与命名空间',
        items: [
            {
                cmd: 'kubectl config get-contexts',
                desc: '列出 kubeconfig 上下文',
                examples: ['kubectl config current-context', 'kubectl config view'],
            },
            {
                cmd: 'kubectl config use-context <ctx>',
                desc: '切换上下文',
                examples: ['kubectl config set-context --current --namespace=<ns>'],
            },
            {
                cmd: 'kubectl config set-context <ctx> --namespace=<ns>',
                desc: '为上下文设置默认命名空间',
                examples: ['kubectl config set-cluster <name> --server=https://...'],
            },
            {
                cmd: 'kubectl get namespaces',
                desc: '列出命名空间',
                examples: ['kubectl get ns', 'kubectl create ns <name>'],
            },
            {
                cmd: 'kubectl config view --minify',
                desc: '仅当前上下文相关配置',
                examples: ['kubectl config view --raw'],
            },
            {
                cmd: 'kubectl -n <ns> ...',
                desc: '单次命令指定命名空间',
                examples: ['kubectl -n kube-system get pods', 'kubectl --all-namespaces get pods'],
            },
            {
                cmd: 'kubectl label / annotate',
                desc: '打标签 / 注解',
                examples: [
                    'kubectl label pod <name> env=prod',
                    'kubectl annotate pod <name> desc="demo" --overwrite',
                ],
            },
        ],
    },
];

function k8srefToGroups() {
    return K8SREF_DATA;
}

let _k8srefApi = null;

function k8srefRender() {
    if (typeof RefEngine === 'undefined' || !RefEngine.mount) {
        return;
    }
    _k8srefApi = RefEngine.mount({
        containerId: 'k8srefContent',
        data: k8srefToGroups(),
        searchId: 'k8srefSearch',
    });
}

function k8srefSearch() {
    if (_k8srefApi) {
        _k8srefApi.search();
    }
}

if (typeof registerInit === 'function') {
    registerInit('k8sref', k8srefRender);
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        K8SREF_DATA: K8SREF_DATA,
        k8srefToGroups: k8srefToGroups,
    };
}
