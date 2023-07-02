import { ipcRenderer, contextBridge, Input } from 'electron';

let KeyboardPressElement: HTMLInputElement | null = null;

contextBridge.exposeInMainWorld('versions', {
    node: () => process.versions.node,
    chrome: () => process.versions.chrome,
    electron: () => process.versions.electron,
});

contextBridge.exposeInMainWorld('ipcRenderer', {
    send: (channel: string, data: unknown[]) => ipcRenderer.send(channel, data),
    on: (channel: string, func: (...args: unknown[]) => void) =>
        ipcRenderer.on(channel, (event, ...args) => func(args)),
});

ipcRenderer.on('DataSetting', (e, data: { [a: string]: unknown } | undefined) => {
    if(data) {
        for(const [k, v] of Object.entries(data)) {
            (document.querySelector(`[name="${k}"]`) as HTMLInputElement).value = v as string;
        }
    }
});

ipcRenderer.on('HasilDirectory', (e, arg) => {
    (document.getElementById('saveDirectory') as HTMLInputElement).value = arg;
});

const KeyYangDiTekan: Set<string> = new Set();
ipcRenderer.on('InputKeyboard', (ev, data: Input) => {
    if(!data) return;
    if(data.type === "keyUp") return;
    if(data.isAutoRepeat) return;
    KeyYangDiTekan.clear();
    
    if(data.control) {
        KeyYangDiTekan.add("Control");
    }
    if(data.alt) {
        KeyYangDiTekan.add("Alt");
    }
    if(data.shift) {
        KeyYangDiTekan.add("Shift");
    }

    KeyYangDiTekan.add(data.key.length === 1 ? data.key.toUpperCase() : data.key);

    KeyboardPressElement.value = Array.from(KeyYangDiTekan).join("+");
});

onload = () => {
    const FormSetting = document.getElementById('semua_setting') as HTMLFormElement;
    const TombolCariSaveDirectory = document.getElementById('cariSaveDirectory');
    const KeybindRecording = document.getElementById('KeybindRecording') as HTMLInputElement;
    const KeybindStopRecording = document.getElementById('KeybindStopRecording') as HTMLInputElement;

    TombolCariSaveDirectory.onclick = () => {
        ipcRenderer.send('BukaDirectory');
    }

    for(const ElementKeybind of [KeybindRecording, KeybindStopRecording]) {
        ElementKeybind.addEventListener('focus', () => {
            KeyboardPressElement = ElementKeybind;
            ipcRenderer.send("BolehDapatinKeyboard", true);
        });
    
        ElementKeybind.addEventListener('focusout', () => {
            KeyboardPressElement = null;
            ipcRenderer.send("BolehDapatinKeyboard", false);
        });
    }


    document.getElementById('OK').onclick = () => {
        const dataForm = new FormData(FormSetting);
        const data: {[nama: string]: unknown} = {};
        dataForm.forEach((v, k) => {
            data[k] = v;
        });
        
        ipcRenderer.send("SimpanSetting", data);
        ipcRenderer.send("CloseSetting");
    }

    document.getElementById('Cancel').onclick = () => {
        ipcRenderer.send("CloseSetting");
    };

    document.getElementById('Apply').onclick = () => {
        const dataForm = new FormData(FormSetting);
        const data: {[nama: string]: unknown} = {};
        dataForm.forEach((v, k) => {
            data[k] = v;
        });
        
        ipcRenderer.send("SimpanSetting", data);
    }
}
