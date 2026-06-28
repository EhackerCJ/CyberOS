const $ = (id) => document.getElementById(id);
let highestZ = 100;

// --- VIRTUAL FILE SYSTEM (VFS) ---
class VFS {
    constructor() {
        if(!localStorage.getItem('vfs_storage')) {
            const initialStruct = {
                "root": {
                    "documents": { "welcome.txt": "Welcome to CyberOS." },
                    "system": { "config.sys": "LOAD=TRUE" },
                    "projects": {}
                }
            };
            localStorage.setItem('vfs_storage', JSON.stringify(initialStruct));
        }
        this.fs = JSON.parse(localStorage.getItem('vfs_storage'));
    }
    save() { localStorage.setItem('vfs_storage', JSON.stringify(this.fs)); }
    list(path) {
        let dir = this.fs["root"];
        if(path !== "root") {
            const parts = path.split('/');
            for(let p of parts) { if(dir[p]) dir = dir[p]; else return null; }
        }
        return Object.keys(dir);
    }
    mkdir(name) {
        if(!this.fs["root"][name]) {
            this.fs["root"][name] = {};
            this.save();
            return `Directory ${name} created.`;
        }
        return `Directory ${name} already exists.`;
    }
}
const sysFS = new VFS();

// --- BOOT & LOGIN ---
const bootLogs = [
    "Kernel memory allocation... OK",
    "Mounting VFS from LocalStorage... OK",
    "Loading window manager protocols... OK",
    "Establishing secure network socket... OK",
    "Bypassing firewall... SUCCESS",
    "Starting display manager..."
];

async function runBoot() {
    for(let i=0; i<bootLogs.length; i++) {
        $('boot-log').innerHTML += `<div>[SYS] ${bootLogs[i]}</div>`;
        $('boot-progress').style.width = `${((i+1)/bootLogs.length)*100}%`;
        await new Promise(r => setTimeout(r, 300));
    }
    setTimeout(() => {
        $('boot-screen').classList.replace('active', 'hidden');
        $('login-screen').classList.replace('hidden', 'active');
    }, 500);
}

$('biometric-scan').onclick = function() {
    this.classList.add('scanning');
    this.querySelector('span').innerText = "ANALYZING...";
    setTimeout(() => {
        $('login-screen').classList.replace('active', 'hidden');
        $('desktop-screen').classList.replace('hidden', 'active');
        setInterval(() => $('clock').innerText = new Date().toLocaleTimeString(), 1000);
    }, 1500);
}

window.onload = runBoot;

// --- START MENU ---
$('start-btn').onclick = () => {
    $('start-menu').classList.toggle('hidden');
    $('start-btn').classList.toggle('active');
};
document.addEventListener('click', (e) => {
    if(!e.target.closest('#start-menu') && e.target.id !== 'start-btn') {
        $('start-menu').classList.add('hidden');
        $('start-btn').classList.remove('active');
    }
});

// --- ADVANCED WINDOW MANAGER ---
class WindowManager {
    constructor() { this.apps = {}; }

    openApp(id) {
        if(this.apps[id]) {
            const win = $(`win-${id}`);
            if(win.classList.contains('minimized')) this.toggleMinimize(id);
            this.focus(id);
            return;
        }

        const appConfig = this.getAppConfig(id);
        if(!appConfig) return;

        const win = document.createElement('div');
        win.id = `win-${id}`;
        win.className = 'os-window glass-panel';
        win.style.width = `${appConfig.w}px`;
        win.style.height = `${appConfig.h}px`;
        win.style.top = `${100 + (Object.keys(this.apps).length * 30)}px`;
        win.style.left = `${150 + (Object.keys(this.apps).length * 30)}px`;
        win.style.zIndex = ++highestZ;

        win.innerHTML = `
            <div class="window-header">
                <span style="color:var(--secondary-color); font-weight:bold;">${appConfig.title}</span>
                <div class="window-controls">
                    <span onclick="os.toggleMinimize('${id}')">_</span>
                    <span onclick="os.toggleMaximize('${id}')">□</span>
                    <span onclick="os.closeApp('${id}')">X</span>
                </div>
            </div>
            <div class="window-content">${appConfig.html}</div>
        `;
        
        $('window-container').appendChild(win);
        this.makeDraggable(win, win.querySelector('.window-header'));
        win.addEventListener('mousedown', () => this.focus(id));
        
        this.apps[id] = { element: win, minimized: false, maximized: false };
        this.addToTaskbar(id, appConfig.title);
        
        if(appConfig.init) appConfig.init(win);
    }

    closeApp(id) {
        $(`win-${id}`).remove();
        $(`tb-${id}`).remove();
        delete this.apps[id];
    }

    toggleMinimize(id) {
        const win = this.apps[id].element;
        const tb = $(`tb-${id}`);
        if(this.apps[id].minimized) {
            win.classList.remove('minimized');
            tb.classList.add('active');
            this.focus(id);
        } else {
            win.classList.add('minimized');
            tb.classList.remove('active');
        }
        this.apps[id].minimized = !this.apps[id].minimized;
    }

    toggleMaximize(id) {
        const win = this.apps[id].element;
        win.classList.toggle('maximized');
    }

    focus(id) {
        this.apps[id].element.style.zIndex = ++highestZ;
        document.querySelectorAll('.taskbar-app').forEach(el => el.classList.remove('active'));
        $(`tb-${id}`).classList.add('active');
    }

    addToTaskbar(id, title) {
        const tb = document.createElement('div');
        tb.id = `tb-${id}`;
        tb.className = 'taskbar-app active';
        tb.innerText = title;
        tb.onclick = () => this.toggleMinimize(id);
        $('taskbar-apps').appendChild(tb);
    }

    makeDraggable(el, header) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        header.onmousedown = (e) => {
            if(el.classList.contains('maximized')) return;
            e.preventDefault();
            pos3 = e.clientX; pos4 = e.clientY;
            document.onmouseup = () => { document.onmouseup = null; document.onmousemove = null; };
            document.onmousemove = (e) => {
                e.preventDefault();
                pos1 = pos3 - e.clientX; pos2 = pos4 - e.clientY;
                pos3 = e.clientX; pos4 = e.clientY;
                el.style.top = (el.offsetTop - pos2) + "px";
                el.style.left = (el.offsetLeft - pos1) + "px";
            };
        };
    }

    getAppConfig(id) {
        const apps = {
            'terminal': {
                title: 'ROOT_TERMINAL', w: 600, h: 400,
                html: `<div id="term-out" style="flex:1; overflow-y:auto; margin-bottom:10px;"></div>
                       <div style="display:flex;"><span style="color:var(--primary-color)">root@sys:~$</span>
                       <input type="text" id="term-in" class="cyber-input" style="border:none; padding:0 10px;"></div>`,
                init: (win) => {
                    const input = win.querySelector('#term-in');
                    const out = win.querySelector('#term-out');
                    out.innerHTML = "<div>Type 'help' for commands.</div>";
                    input.addEventListener('keypress', (e) => {
                        if(e.key === 'Enter') {
                            const val = input.value.trim();
                            out.innerHTML += `<div><span style="color:var(--primary-color)">root@sys:~$</span> ${val}</div>`;
                            
                            if(val === 'help') out.innerHTML += "<div>Commands: clear, ls, mkdir [name], date</div>";
                            else if(val === 'clear') out.innerHTML = "";
                            else if(val === 'ls') out.innerHTML += `<div>${sysFS.list('root').join('  ')}</div>`;
                            else if(val.startsWith('mkdir ')) out.innerHTML += `<div>${sysFS.mkdir(val.split(' ')[1])}</div>`;
                            else if(val === 'date') out.innerHTML += `<div>${new Date().toString()}</div>`;
                            else if(val) out.innerHTML += `<div>Command not found: ${val}</div>`;
                            
                            input.value = ''; out.scrollTop = out.scrollHeight;
                        }
                    });
                }
            },
            'calc': {
                title: 'SYS_CALCULATOR', w: 300, h: 400,
                html: `<input type="text" id="calc-display" class="cyber-input" style="font-size:1.5rem; text-align:right; margin-bottom:10px;" readonly>
                       <div class="calc-grid">
                           ${['7','8','9','/','4','5','6','*','1','2','3','-','C','0','=','+'].map(b => `<button class="calc-btn">${b}</button>`).join('')}
                       </div>`,
                init: (win) => {
                    const display = win.querySelector('#calc-display');
                    win.querySelectorAll('.calc-btn').forEach(btn => {
                        btn.onclick = () => {
                            const val = btn.innerText;
                            if(val === 'C') display.value = '';
                            else if(val === '=') {
                                try { display.value = eval(display.value); } 
                                catch { display.value = 'ERROR'; }
                            } else display.value += val;
                        }
                    });
                }
            },
            'settings': {
                title: 'THEME_CONTROL', w: 400, h: 250,
                html: `<div><h3>Select System Accent</h3><br>
                       <div style="display:flex; gap:10px;">
                           <div class="theme-box" style="background:#00ff41;" onclick="changeTheme('#00ff41')"></div>
                           <div class="theme-box" style="background:#00d9ff;" onclick="changeTheme('#00d9ff')"></div>
                           <div class="theme-box" style="background:#ff2a2a;" onclick="changeTheme('#ff2a2a')"></div>
                           <div class="theme-box" style="background:#ffb700;" onclick="changeTheme('#ffb700')"></div>
                       </div></div>`
            },
            'files': {
                title: 'FILE_EXPLORER', w: 500, h: 350,
                html: `<div style="display:flex; height:100%;">
                           <div style="width:150px; border-right:1px solid var(--secondary-color); padding:10px;">
                               <div style="cursor:pointer; margin-bottom:10px; color:var(--primary-color)">[ ROOT ]</div>
                           </div>
                           <div id="file-view" style="flex:1; padding:10px; display:flex; gap:15px; flex-wrap:wrap; align-content:flex-start;">
                               ${sysFS.list('root').map(f => `<div style="text-align:center;"><div style="font-size:2rem; color:var(--secondary-color)">📁</div>${f}</div>`).join('')}
                           </div>
                       </div>`
            }
        };
        return apps[id];
    }
}

const os = new WindowManager();

// Global theme changer attached to window so Settings app can use it
window.changeTheme = (color) => {
    document.documentElement.style.setProperty('--primary-color', color);
};
