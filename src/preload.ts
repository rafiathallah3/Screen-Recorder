// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { ipcRenderer, contextBridge, DesktopCapturerSource } from 'electron';

let jam = 0;
let menit = 0;
let detik = 0;
let milidetik = 0;

let ApakahRecording = false;
let mediaRecorder: MediaRecorder;
let recordedChuncks: Blob[] = [];
// let microphoneMediaRecorder: MediaRecorder;
// let microphoneChunks: Blob[] = [];

ipcRenderer.on('VideoRecorder', (event, sources: DesktopCapturerSource[]) => {
    try {
        TunjuinDesktop(sources[0].id);

		const PilihScreen: HTMLSelectElement = document.getElementById('pilihScreen') as HTMLSelectElement;
        PilihScreen.innerHTML = '';
        sources.forEach((source) => {
			const TambahinSelect: HTMLOptionElement = document.createElement('option');
			TambahinSelect.value = source.id;
			TambahinSelect.innerHTML = source.name;
			PilihScreen.appendChild(TambahinSelect);

			if(source.id === "screen:0:0") {
				PilihScreen.value = source.id;
			}
        });
    } catch (e) {
        console.log(e);
    }
});

ipcRenderer.on("MulaiRecording", () => {
	MulaiRecording();
});

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

async function TunjuinDesktop(source: string) {
	const stream = await navigator.mediaDevices.getUserMedia({
		audio: {
			mandatory: {
				chromeMediaSource: 'desktop'
			}
		},
		video: {
			mandatory: {
				chromeMediaSource: 'desktop',
				chromeMediaSourceId: source,
				minWidth: 1280,
				maxWidth: 1280,
				minHeight: 720,
				maxHeight: 720
			}
		}
	} as unknown);
	
	// Voice Microphone tidak bisa di merge dengan video, tidak tau kenapa. Jadi harus di abandond :( 02/07/2023 17:51
	// const VoiceMicrophone = await navigator.mediaDevices.getUserMedia({ audio: true });

	const video = document.querySelector('video');
	video.srcObject = stream;
	video.onloadedmetadata = () => video.play();

	mediaRecorder = new MediaRecorder(stream);
	mediaRecorder.ondataavailable = (e) => {
		recordedChuncks.push(e.data);
	}
	mediaRecorder.onstop = async () => {
		const blob = new Blob(recordedChuncks, {
			type: 'video/webm; codecs=vp9'
		});
		const buffer = Buffer.from(await blob.arrayBuffer());
		recordedChuncks = [];

		return ipcRenderer.send('simpanVideo', [ buffer ]);
	}

	// microphoneMediaRecorder = new MediaRecorder(VoiceMicrophone);
	// microphoneMediaRecorder.ondataavailable = (e) => {
	// 	microphoneChunks.push(e.data);
	// }
	// microphoneMediaRecorder.onstop = async () => {
	// 	const blob = new Blob(microphoneChunks, {
	// 		type: 'audio/webm'
	// 	});
	// 	const buffer = Buffer.from(await blob.arrayBuffer());
	// 	microphoneChunks = [];

	// 	return ipcRenderer.send("simpanVoice", [ buffer ]);
	// }
}

function MulaiStopWatch() {
    if(ApakahRecording) {
        milidetik++;
 
        if (milidetik == 100) {
            detik++;
            milidetik = 0;
        }
 
        if (detik == 60) {
            menit++;
            detik = 0;
        }
 
        if (menit == 60) {
            jam++;
            menit = 0;
            detik = 0;
        }
 
        let jamString: string = jam.toString();
        let menitString: string = menit.toString();
        let detikString: string = detik.toString();
        let milidetikString: string = milidetik.toString();
 
        if (jam < 10) {
            jamString = "0" + jamString;
        }
 
        if (menit < 10) {
            menitString = "0" + menitString;
        }
 
        if (detik < 10) {
            detikString = "0" + detikString;
        }
 
        if (milidetik < 10) {
            milidetikString = "0" + milidetikString;
        }

        document.getElementById("waktu").innerHTML = `${jamString}:${menitString}:${detikString}:${milidetikString}`;

        setTimeout(MulaiStopWatch, 10);
    }
}

function MulaiRecording() {
	const rekamElement = document.getElementById("rekam");
    const hentikanRekamElement = document.getElementById("hentikan_rekam");

	if(!ApakahRecording) {
		mediaRecorder.start();
		// microphoneMediaRecorder.start();

		ApakahRecording = true;

		rekamElement.innerHTML = "Stop Recording";
		hentikanRekamElement.classList.remove('d-none');

		MulaiStopWatch();
		return;
	}

	jam = 0;
	menit = 0;
	detik = 0;
	milidetik = 0;
	document.getElementById("waktu").innerHTML = "00:00:00:00";
	
	// microphoneMediaRecorder.stop();
	mediaRecorder.stop();
	
	ApakahRecording = false;

	rekamElement.innerHTML = "Record";
	hentikanRekamElement.classList.add('d-none');
}

onload = () => {
    const rekamElement = document.getElementById("rekam");
    const hentikanRekamElement = document.getElementById("hentikan_rekam");
	const PilihanScreen: HTMLSelectElement = document.getElementById('pilihScreen') as HTMLSelectElement;

	PilihanScreen.onchange = (ev) => {
		TunjuinDesktop((ev.target as unknown as { value: string }).value);
	}

    rekamElement.onclick = () => {
        MulaiRecording();
    }

    hentikanRekamElement.onclick = () => {
        MulaiRecording();
    }
}