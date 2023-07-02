/* eslint-disable @typescript-eslint/no-explicit-any */
import { app, BrowserWindow, desktopCapturer, ipcMain, dialog, Menu, globalShortcut } from 'electron';
import { set, get } from 'electron-json-storage';
import { writeFile, existsSync } from 'fs';
import * as os from 'os';
import * as path from "path";
// import url from 'url';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
// if (require('electron-squirrel-startup')) {
// 	app.quit();
// }

interface TipeSetting { 
	saveDirectory: string,
	KeybindRecording: string,
	KeybindStopRecording: string
}

const isMac = process.platform === 'darwin';

const TemplateSetting: TipeSetting = {
	saveDirectory: `C:/Users/${os.userInfo().username}/Videos`,
	KeybindRecording: "Control+F1",
	KeybindStopRecording: "Control+F1"
}

let mainWindow: BrowserWindow | null = null;
const createWindow = () => {
	// Create the browser window.
	mainWindow = new BrowserWindow({
		width: 1300,
		height: 800,
		minWidth: 1000,
		minHeight: 750,
		webPreferences: {
			preload: path.join(__dirname, "preload.js"),
			nodeIntegration: true,
			contextIsolation: true,
		},
	});

	// Open the DevTools.
	mainWindow.webContents.openDevTools();

	mainWindow.on('ready-to-show', () => {
		mainWindow.webContents.setAudioMuted(true);
		desktopCapturer.getSources({ types: ['window', 'screen'] }).then(async sources => {
			mainWindow.webContents.send('VideoRecorder', sources)
		})
	
		mainWindow.webContents.on('did-start-loading', () => {
			desktopCapturer.getSources({ types: ['window', 'screen'] }).then(async sources => {
				mainWindow.webContents.send('VideoRecorder', sources)
			})
		})
	});

	// set('setting', TemplateSetting, ((e) => { console.log(`ERROR: ${e}`) })); //UJI COBA HAPUS KALAU SUDAH DI PRODUCTION

	get('setting', (error, data: TipeSetting) => {
		if(Object.keys(data).length === 0) {
			set('setting', TemplateSetting, ((e) => { console.log(`ERROR: ${e}`) }));
			data = TemplateSetting;
		}

		console.log(data);
		globalShortcut.unregisterAll();

		if(data.KeybindRecording) {
			globalShortcut.register(data.KeybindRecording, () => {
				mainWindow.webContents.send("MulaiRecording");
			});
		}
	
		if(data.KeybindStopRecording && data.KeybindRecording !== data.KeybindStopRecording) {
			globalShortcut.register(data.KeybindStopRecording, () => {
				mainWindow.webContents.send("MulaiRecording");
			});
		}
	});


	// and load the index.html of the app.
	mainWindow.loadFile(path.join(__dirname, '../index.html'));
	const menu = Menu.buildFromTemplate(template as any);

	mainWindow.setMenu(menu);
	// mainWindow.loadURL(url.format({
	// 	pathname: path.join(__dirname, 'index.html'),
	// 	protocol: 'file:',
	// 	slashes: true
	// }))  
};

let windowSetting: BrowserWindow | null = null;
let BolehKirimKeyboard = false;
const SettingsWindow = () => {
	if(windowSetting !== null) return;

	windowSetting = new BrowserWindow({
		title: "Settings",
		width: 1000,
		height: 600,
		minWidth: 800,
		minHeight: 500,
		webPreferences: {
			preload: path.join(__dirname, "preloadSetting.js"),
			nodeIntegration: true,
		}
	});

	windowSetting.webContents.openDevTools();

	windowSetting.loadFile(path.join(__dirname, '../settings.html'));
	const menu = Menu.buildFromTemplate([]);
	
	windowSetting.setMenu(menu);
	get('setting', (error, data) => {
		windowSetting.webContents.send('DataSetting', data);
	});

	windowSetting.webContents.on('before-input-event', (ev, input) => {
		if(BolehKirimKeyboard) {
			windowSetting.webContents.send('InputKeyboard', input);
		}
	})

	windowSetting.on('closed', () => { windowSetting = null });
}

ipcMain.on('simpanVideo', async (e, arr) => {
	// const { filePath } = await dialog.showSaveDialog({
	// 	buttonLabel: 'Save video',
	// 	defaultPath: `vid-${Date.now()}.webm`
	// });
	
	get('setting', (err, data: TipeSetting) => {
		writeFile(`${data.saveDirectory}/vid-${Date.now()}.webm`, arr[0], (e) => console.log('video saved successfully!', e));	
	});
});

ipcMain.on("BukaDirectory", async () => {
	const { canceled, filePaths } = await dialog.showOpenDialog({
		properties: ['openDirectory']
	});

	if(!canceled) {
		windowSetting.webContents.send("HasilDirectory", filePaths[0]);
	}
});

ipcMain.on('CloseSetting', () => {
	windowSetting.close();
	windowSetting = null;
});

ipcMain.on('SimpanSetting', (ev, data: TipeSetting) => {
	if(!existsSync(data.saveDirectory)) {
		data.saveDirectory = TemplateSetting.saveDirectory;
	}

	globalShortcut.unregisterAll();

	if(data.KeybindRecording) {
		globalShortcut.register(data.KeybindRecording, () => {
			mainWindow.webContents.send("MulaiRecording");
		});
	}

	if(data.KeybindStopRecording && data.KeybindRecording !== data.KeybindStopRecording) {
		globalShortcut.register(data.KeybindStopRecording, () => {
			mainWindow.webContents.send("MulaiRecording");
		});
	}

	set('setting', data, (error) => { if(error) { console.log(`ERROR: ${error}` )} });
});

ipcMain.on("BolehDapatinKeyboard", (ev, data: boolean) => {
	BolehKirimKeyboard = data;
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		app.quit();
	}
});

app.on('activate', () => {
	// On OS X it's common to re-create a window in the app when the
	// dock icon is clicked and there are no other windows open.
	if (BrowserWindow.getAllWindows().length === 0) {
		createWindow();
	}
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
const template = [
	// { role: 'appMenu' }
	...(isMac
	? [{
		label: app.name,
		submenu: [
			{ role: 'about' },
			{ type: 'separator' },
			{ role: 'services' },
			{ type: 'separator' },
			{ role: 'hide' },
			{ role: 'hideOthers' },
			{ role: 'unhide' },
			{ type: 'separator' },
			{ role: 'quit' }
		]
		}]
	: []),
	// { role: 'fileMenu' }
	{
		label: 'File',
		submenu: [
			{
				label: 'Settings',	
				click: SettingsWindow	
			},
			{
				role: 'quit'
			}
		]
	},
	// { role: 'windowMenu' }
	{
		label: 'Window',
		submenu: [
			{ role: 'minimize' },
			{ role: 'zoom' },
			...(isMac
			? [
				{ type: 'separator' },
				{ role: 'front' },
				{ type: 'separator' },
				{ role: 'window' }
				]
			: [
				{ role: 'close' }
				])
		]
	},
	// {
	// 	role: 'help',
	// 	submenu: [{
	// 		label: 'Learn More',
	// 		click: async () => {
	// 			await shell.openExternal('https://electronjs.org')
	// 		}
	// 	}]
	// }
]