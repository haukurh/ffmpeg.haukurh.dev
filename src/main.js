const readFile = async (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            resolve(new Uint8Array(e.target.result));
        }

        reader.onerror = (e) => {
            reject(e);
        }

        reader.readAsArrayBuffer(file);
    });
};

let movie = null;
const time = (new Date()).toISOString();
const heightEl = document.getElementById('height');
document.getElementById('input').addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (['video/quicktime', 'video/mp4'].includes(file.type)) {
        readFile(event.target.files[0]).then((file) => {
            movie = moovAtomJS.readMovieAtom(file);
            console.log(movie);
            movie.tracks.forEach((track) => {
                if (track.header && track.header.trackHeight) {
                    heightEl.value = track.header.trackHeight;
                }
            });
        });
    }
});
const selectAll = (query) => document.querySelectorAll(query);
const getFormData = (formId) => {
    const form = new FormData(document.getElementById(formId));
    return Object.fromEntries(form);
};
const wait = async (callback, time) => {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve(callback());
        }, time);
    });
};

const message = (msg, classes) => {
    const body = document.getElementById('messages');
    let modal = document.createElement('div');
    const hide = () => {
        wait(() => modal.classList.add('hide'), 4000)
            .then(() => {});
    }
    modal.classList.add('message');
    modal.innerText = msg;
    wait(() => body.appendChild(modal), 0)
        .then(() => hide())
};
const copy = async text => {
    navigator.clipboard.writeText(text)
        .then(() => console.log(`Copied '${text}' to clipboard`))
        .catch(() => console.error(`Unable to copy '${text}' to clipboard`));
}
const tokenize = (str) => {
    let token = str.toLowerCase().split(' ').join('-');
    if (token.includes('.')) {
        const tmp = token.split('.');
        tmp.pop();
        token = tmp.join('.');
    }
    return token;
};
const handle = () => {
    const preData = getFormData('ffmpeg');
    const cli = document.getElementById('cli');

    const hasVideo = preData.vcodec !== 'vn';
    const hasVideoCode = preData.vcodec !== 'vn' && preData.vcodec !== 'copy';
    const hasResize = preData.resize === 'true' && hasVideoCode;
    const hasFPS = preData.fps !== '-1' && hasVideoCode;
    const hasVideoFilters = hasResize || hasFPS;
    const hasAudio = preData.acodec !== 'an';
    const hasAudioCode = preData.acodec !== 'an' && preData.acodec !== 'copy' && preData.acodec !== 'aac-ffmpeg';

    selectAll('.vcodec').forEach((el) => el.disabled = !hasVideoCode);
    selectAll('.acodec').forEach((el) => el.disabled = !hasAudioCode);
    selectAll('.resize').forEach((el) => el.disabled = !hasResize);
    const data = getFormData('ffmpeg');
    data.acodec = data.acodec === 'aac-ffmpeg' ? 'aac' : data.acodec;

    let command = [preData.binary, '-i'];
    const flags = ['-flags'];

    if (data.filename.length === 0 && data.input && data.input.name.length > 0) {
        const tokenFilename = tokenize(data.input.name);
        document.getElementById('filename').value = tokenFilename;
        data.filename = tokenFilename;
    }

    const output = `"${data.filename}.${data.format}"`;
    command.push(`"${data.input.name}"`);

    if (hasVideo) {
        command.push('-c:v');
        command.push(data.vcodec);

        if (hasVideoCode) {
            command.push('-crf');
            command.push(data.crf);

            command.push('-preset');
            command.push(data.preset);

            if (data.profile !== 'ffmpeg') {
                command.push('-profile:v');
                command.push(data.profile);
                if (data.level !== 'ffmpeg') {
                    command.push('-level');
                    command.push(data.level);
                }
            }

            if (data.faststart) {
                command.push('-movflags');
                command.push('+faststart');
                flags.push('+global_header');
            }

            if (data.yuv420p) {
                command.push('-pix_fmt');
                command.push('yuv420p');
            }

            if (hasVideoFilters) {
                command.push('-vf');
                const filters = [];
                if (hasResize) {
                    filters.push(`scale=-2:${data.height}`);
                }
                if (hasFPS) {
                    filters.push(`fps=fps=${data.fps}`);
                }
                command.push(`"${filters.join(',')}"`);
            }
        }
    } else {
        command.push('-vn');
    }

    if (hasAudio) {
        command.push('-c:a');
        command.push(data.acodec);

        if (hasAudioCode) {
            //  -b:a 128k
            command.push('-b:a');
            command.push(`${data.ba}k`);
        }
    } else {
        command.push('-an');
    }

    if (data.strip) {
        command.push('-bitexact');
        command.push('-map_metadata');
        command.push('-1');
        command.push('-vbsf');
        command.push('filter_units=remove_types=6');
    }

    if (data.create) {
        command.push('-metadata');
        command.push(`creation_time="${time}"`);
    }

    if (data.title && data.title.length > 0) {
        command.push('-metadata');
        command.push(`title="${data.title}"`);
    }

    if (hasVideo) {
        command.push('-metadata:s:v:0');
        command.push(`language=${data.vlang}`);
    }

    if (hasAudio) {
        command.push('-metadata:s:a:0');
        command.push(`language=${data.vlang}`);
    }

    if (data.tstart) {
        command.push(`-ss ${data.tstart}`);
    }

    if (data.tstart && data.tstop) {
        command.push(`-to ${data.tstop}`);
    }

    if (flags.length > 1) {
        command = command.concat(flags);
    }

    command.push(output);

    cli.innerText = command.join(' ');
};
handle();

selectAll('input').forEach((el) => el.addEventListener('input', handle));
selectAll('select').forEach((el) => el.addEventListener('change', handle));
document.getElementById('copy').addEventListener('click', () => {
    const cli = document.getElementById('cli');
    copy(cli.innerText).then(() => message('ffmpeg command copied!'));
});
