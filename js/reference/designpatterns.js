const DESIGN_PATTERNS = [
    {
        cat: '创建型模式',
        items: [
            {
                name: '单例模式 (Singleton)',
                desc: '确保一个类只有一个实例',
                syntax: 'Singleton.getInstance()',
                examples: ['private static volatile Singleton instance;', '双重检查锁定（Double-Checked Locking）'],
                code: `public class Singleton {
    private static volatile Singleton instance;
    private Singleton() {}
    public static Singleton getInstance() {
        if (instance == null) {
            synchronized (Singleton.class) {
                if (instance == null) {
                    instance = new Singleton();
                }
            }
        }
        return instance;
    }
}`,
            },
            {
                name: '工厂方法 (Factory Method)',
                desc: '定义创建对象的接口，让子类决定实例化哪个类',
                code: `public interface Product {
    String getName();
}

public class ConcreteProductA implements Product {
    public String getName() { return "Product A"; }
}

public abstract class Factory {
    public abstract Product createProduct();
}

public class ConcreteFactoryA extends Factory {
    public Product createProduct() {
        return new ConcreteProductA();
    }
}`,
            },
            {
                name: '抽象工厂 (Abstract Factory)',
                desc: '创建一系列相关或依赖对象的接口',
                code: `public interface GUIFactory {
    Button createButton();
    TextField createTextField();
}

public class WindowsFactory implements GUIFactory {
    public Button createButton() { return new WindowsButton(); }
    public TextField createTextField() { return new WindowsTextField(); }
}

public class MacFactory implements GUIFactory {
    public Button createButton() { return new MacButton(); }
    public TextField createTextField() { return new MacTextField(); }
}`,
            },
            {
                name: '建造者模式 (Builder)',
                desc: '将复杂对象的构建与表示分离',
                code: `public class User {
    private final String name;
    private final int age;
    private final String email;

    private User(Builder builder) {
        this.name = builder.name;
        this.age = builder.age;
        this.email = builder.email;
    }

    public static class Builder {
        private String name;
        private int age;
        private String email;

        public Builder name(String name) { this.name = name; return this; }
        public Builder age(int age) { this.age = age; return this; }
        public Builder email(String email) { this.email = email; return this; }
        public User build() { return new User(this); }
    }
}

// 使用: new User.Builder().name("张三").age(25).email("zhangsan@example.com").build();`,
            },
            {
                name: '原型模式 (Prototype)',
                desc: '通过复制现有实例来创建新实例',
                code: `public abstract class Shape implements Cloneable {
    protected String type;
    public abstract void draw();
    public Shape clone() {
        try {
            return (Shape) super.clone();
        } catch (CloneNotSupportedException e) {
            return null;
        }
    }
}

public class Circle extends Shape {
    public Circle() { type = "Circle"; }
    public void draw() { System.out.println("Drawing Circle"); }
}`,
            },
        ],
    },
    {
        cat: '结构型模式',
        items: [
            {
                name: '适配器模式 (Adapter)',
                desc: '将一个类的接口转换成客户端期望的另一个接口',
                code: `public interface MediaPlayer {
    void play(String audioType, String fileName);
}

public class AdvancedMediaPlayer {
    void playVlc(String fileName) { /*...*/ }
    void playMp4(String fileName) { /*...*/ }
}

public class MediaAdapter implements MediaPlayer {
    private AdvancedMediaPlayer advancedPlayer;

    public MediaAdapter(String audioType) {
        advancedPlayer = new AdvancedMediaPlayer();
    }

    public void play(String audioType, String fileName) {
        if (audioType.equalsIgnoreCase("vlc")) {
            advancedPlayer.playVlc(fileName);
        } else if (audioType.equalsIgnoreCase("mp4")) {
            advancedPlayer.playMp4(fileName);
        }
    }
}`,
            },
            {
                name: '装饰器模式 (Decorator)',
                desc: '动态地给对象添加额外职责',
                code: `public interface Shape {
    void draw();
}

public class Circle implements Shape {
    public void draw() { System.out.println("Drawing Circle"); }
}

public abstract class ShapeDecorator implements Shape {
    protected Shape decoratedShape;
    public ShapeDecorator(Shape decoratedShape) {
        this.decoratedShape = decoratedShape;
    }
    public void draw() { decoratedShape.draw(); }
}

public class RedShapeDecorator extends ShapeDecorator {
    public RedShapeDecorator(Shape decoratedShape) {
        super(decoratedShape);
    }
    public void draw() {
        decoratedShape.draw();
        setRedBorder(decoratedShape);
    }
    private void setRedBorder(Shape decoratedShape) {
        System.out.println("Border Color: Red");
    }
}`,
            },
            {
                name: '代理模式 (Proxy)',
                desc: '为其他对象提供一种代理以控制对这个对象的访问',
                code: `public interface Image {
    void display();
}

public class RealImage implements Image {
    private String fileName;
    public RealImage(String fileName) {
        this.fileName = fileName;
        loadFromDisk(fileName);
    }
    public void display() { System.out.println("Displaying " + fileName); }
    private void loadFromDisk(String fileName) {
        System.out.println("Loading " + fileName);
    }
}

public class ProxyImage implements Image {
    private RealImage realImage;
    private String fileName;
    public ProxyImage(String fileName) { this.fileName = fileName; }
    public void display() {
        if (realImage == null) {
            realImage = new RealImage(fileName);
        }
        realImage.display();
    }
}`,
            },
            {
                name: '外观模式 (Facade)',
                desc: '为子系统中的一组接口提供一个一致的界面',
                code: `public class CPU { void start() { /*...*/ } }
public class Memory { void load() { /*...*/ } }
public class Disk { void read() { /*...*/ } }

public class ComputerFacade {
    private CPU cpu;
    private Memory memory;
    private Disk disk;

    public ComputerFacade() {
        this.cpu = new CPU();
        this.memory = new Memory();
        this.disk = new Disk();
    }

    public void start() {
        cpu.start();
        memory.load();
        disk.read();
    }
}`,
            },
            {
                name: '组合模式 (Composite)',
                desc: '将对象组合成树形结构以表示"部分-整体"的层次结构',
                code: `public abstract class Employee {
    protected String name;
    public abstract void show();
}

public class Developer extends Employee {
    public Developer(String name) { this.name = name; }
    public void show() { System.out.println("Developer: " + name); }
}

public class Manager extends Employee {
    private List<Employee> subordinates = new ArrayList<>();
    public Manager(String name) { this.name = name; }
    public void add(Employee e) { subordinates.add(e); }
    public void show() {
        System.out.println("Manager: " + name);
        subordinates.forEach(Employee::show);
    }
}`,
            },
        ],
    },
    {
        cat: '行为型模式',
        items: [
            {
                name: '策略模式 (Strategy)',
                desc: '定义一系列算法，把它们一个个封装起来',
                code: `public interface SortStrategy {
    void sort(int[] array);
}

public class BubbleSort implements SortStrategy {
    public void sort(int[] array) { /* 冒泡排序实现 */ }
}

public class QuickSort implements SortStrategy {
    public void sort(int[] array) { /* 快速排序实现 */ }
}

public class Sorter {
    private SortStrategy strategy;
    public void setStrategy(SortStrategy strategy) {
        this.strategy = strategy;
    }
    public void sort(int[] array) {
        strategy.sort(array);
    }
}`,
            },
            {
                name: '观察者模式 (Observer)',
                desc: '定义对象间的一种一对多的依赖关系',
                code: `public interface Observer {
    void update(String message);
}

public class Subject {
    private List<Observer> observers = new ArrayList<>();
    private String state;

    public void attach(Observer observer) { observers.add(observer); }
    public void detach(Observer observer) { observers.remove(observer); }
    public void setState(String state) {
        this.state = state;
        notifyAllObservers();
    }
    private void notifyAllObservers() {
        observers.forEach(o -> o.update(state));
    }
}

public class ConcreteObserver implements Observer {
    private String name;
    public ConcreteObserver(String name) { this.name = name; }
    public void update(String message) {
        System.out.println(name + " received: " + message);
    }
}`,
            },
            {
                name: '模板方法 (Template Method)',
                desc: '定义一个操作中的算法骨架，将某些步骤延迟到子类',
                code: `public abstract class Game {
    abstract void initialize();
    abstract void startPlay();
    abstract void endPlay();

    public final void play() {
        initialize();
        startPlay();
        endPlay();
    }
}

public class Cricket extends Game {
    void initialize() { System.out.println("Cricket Game Initialized"); }
    void startPlay() { System.out.println("Cricket Game Started"); }
    void endPlay() { System.out.println("Cricket Game Finished"); }
}`,
            },
            {
                name: '状态模式 (State)',
                desc: '允许对象在内部状态改变时改变它的行为',
                code: `public interface State {
    void doAction(Context context);
}

public class StartState implements State {
    public void doAction(Context context) {
        System.out.println("Player is in start state");
        context.setState(this);
    }
}

public class StopState implements State {
    public void doAction(Context context) {
        System.out.println("Player is in stop state");
        context.setState(this);
    }
}

public class Context {
    private State state;
    public void setState(State state) { this.state = state; }
    public State getState() { return state; }
}`,
            },
            {
                name: '责任链模式 (Chain of Responsibility)',
                desc: '使多个对象都有机会处理请求，将这些对象连成一条链',
                code: `public abstract class Handler {
    protected Handler next;
    public Handler setNext(Handler handler) {
        this.next = handler;
        return handler;
    }
    public abstract void handle(String request);
}

public class AuthHandler extends Handler {
    public void handle(String request) {
        if (request.contains("auth")) {
            System.out.println("Authenticated");
        } else if (next != null) {
            next.handle(request);
        }
    }
}

public class LogHandler extends Handler {
    public void handle(String request) {
        System.out.println("Logging: " + request);
        if (next != null) next.handle(request);
    }
}`,
            },
        ],
    },
];

let _designpatternsSearchTimer = null;

function designpatternsRender(filter) {
    if (filter === undefined) {
        const el = document.getElementById('designpatternsSearch');
        filter = el ? el.value : '';
    }
    filter = (filter || '').toLowerCase();
    const container = document.getElementById('designpatternsContent');
    if (!container) return;
    container.innerHTML = '';
    let hasResult = false;
    DESIGN_PATTERNS.forEach((group) => {
        const matched = filter
            ? group.items.filter(
                (it) => it.name.toLowerCase().includes(filter) || it.desc.toLowerCase().includes(filter)
            )
            : group.items;
        if (matched.length === 0) return;
        hasResult = true;
        const h = document.createElement('div');
        h.style.cssText =
            'font-size:13px;font-weight:600;color:var(--accent);padding:10px 0 6px;border-bottom:1px solid var(--border);margin-bottom:4px';
        h.textContent = group.cat;
        container.appendChild(h);
        matched.forEach((item) => {
            const card = document.createElement('div');
            card.style.cssText = 'margin-bottom:8px;border:1px solid var(--border);border-radius:6px;overflow:hidden';
            const header = document.createElement('div');
            header.style.cssText =
                'display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:var(--glass);cursor:pointer';
            let headerHtml =
                '<div><strong style="color:var(--accent2)">' +
                item.name +
                '</strong><span style="color:var(--text-dim);margin-left:8px;font-size:12px">' +
                item.desc +
                '</span></div>';
            if (item.syntax) {
                headerHtml +=
                    '<code style="font-size:11px;color:var(--accent);background:var(--bg-input);padding:2px 6px;border-radius:3px">' +
                    item.syntax.replace(/</g, '&lt;') +
                    '</code>';
            }
            headerHtml += '<i class="bi bi-chevron-down" style="color:var(--text-dim);transition:transform .2s"></i>';
            header.innerHTML = headerHtml;
            const codeBlock = document.createElement('div');
            codeBlock.style.cssText = 'display:none;padding:12px;background:var(--bg-input);position:relative';
            let codeHtml = '';
            if (item.examples && item.examples.length > 0) {
                codeHtml +=
                    '<div style="margin-bottom:8px;font-size:11px;color:var(--text-dim)"><strong>使用场景:</strong> ' +
                    item.examples.join(' | ').replace(/</g, '&lt;') +
                    '</div>';
            }
            codeHtml +=
                '<pre style="margin:0;font-size:12px;font-family:var(--font);white-space:pre-wrap;overflow-x:auto"><code>' +
                item.code.replace(/</g, '&lt;').replace(/>/g, '&gt;') +
                '</code></pre><button style="position:absolute;top:8px;right:8px;font-size:11px;padding:2px 8px;background:var(--accent);color:#fff;border:none;border-radius:3px;cursor:pointer" onclick="safeCopy(this.parentElement.querySelector(\'code\').textContent)">复制</button>';
            codeBlock.innerHTML = codeHtml;
            header.addEventListener('click', function () {
                const isOpen = codeBlock.style.display !== 'none';
                codeBlock.style.display = isOpen ? 'none' : 'block';
                header.querySelector('i').style.transform = isOpen ? '' : 'rotate(180deg)';
            });
            card.appendChild(header);
            card.appendChild(codeBlock);
            container.appendChild(card);
        });
    });
    if (!hasResult) {
        container.innerHTML = '<div style="color:var(--text-dim);padding:20px;text-align:center">无匹配结果</div>';
    }
}

function designpatternsSearch() {
    clearTimeout(_designpatternsSearchTimer);
    _designpatternsSearchTimer = setTimeout(function () {
        const el = document.getElementById('designpatternsSearch');
        designpatternsRender(el ? el.value : '');
    }, 200);
}

registerInit('designpatterns', designpatternsRender);
