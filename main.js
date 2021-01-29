function main() {
    const canvas = document.getElementById("canvas");
    const layer = document.getElementById("layer");
    const layer2 = document.getElementById("layer2");
    const layer3 = document.getElementById("layer3");
    const canvas2 = document.getElementById("outcanvas");
    const canvas3 = document.getElementById("outcanvas2");
    const inpt = document.getElementById("input");
    const ctx = canvas.getContext("2d");
    const front = document.getElementById("front");
    const back = document.getElementById("back");

    const frontPoints = [];
    const backPoints = [];
    let mat = null;
    let origSize = null;
    let mask = null;
    let bgdModel = null;
    let fgdModel = null;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#000000";
    ctx.textAlign = "center";
    ctx.fillText("Upload image...", canvas.width/2, canvas.height/2);

    canvas2.getContext("2d").fillText("front", canvas.width/2, canvas.height/2);
    canvas3.getContext("2d").fillText("back", canvas.width/2, canvas.height/2);

    const handleImage = () => new Promise((resolve, reject) => {
        const file = inpt.files[0];
        const reader = new FileReader();
    
        reader.readAsDataURL(file);
        reader.onload = () => {
            if (mat !== null) {
                console.log("releasing mat...");
                mat.delete();
                mat = null;
                mask.delete();
                bgdModel.delete();
                fgdModel.delete();
            }

            const img = new Image();
            img.src = reader.result;
            img.onload = () => resolve(img);
            img.onerror = (e) => reject(e);
        };
        reader.onerror = (e) => reject(e);
    });

    const updateFromMask = () => {
        const mat2 = new cv.Mat();
        mat.copyTo(mat2);
        for (let i = 0; i < canvas.height; i++) {
            for (let j = 0; j < canvas.width; j++) {
                if (mask.ucharPtr(i, j)[0] == 0) {
                    mat2.ucharPtr(i, j)[0] = 0;
                    mat2.ucharPtr(i, j)[1] = 0;
                    mat2.ucharPtr(i, j)[2] = 255;
                }
                else if (mask.ucharPtr(i, j)[0] == 2) {
                    mat2.ucharPtr(i, j)[0] = 0;
                    mat2.ucharPtr(i, j)[1] = 0;
                    mat2.ucharPtr(i, j)[2] = 128;
                }
            }
        }
        cv.imshow('outcanvas', mat2);
        mat2.delete();

        const mat3 = new cv.Mat();
        mat.copyTo(mat3);
        for (let i = 0; i < canvas.height; i++) {
            for (let j = 0; j < canvas.width; j++) {
                if (mask.ucharPtr(i, j)[0] == 1) {
                    mat3.ucharPtr(i, j)[0] = 255;
                    mat3.ucharPtr(i, j)[1] = 0;
                    mat3.ucharPtr(i, j)[2] = 0;
                }
                else if (mask.ucharPtr(i, j)[0] == 3) {
                    mat3.ucharPtr(i, j)[0] = 128;
                    mat3.ucharPtr(i, j)[1] = 0;
                    mat3.ucharPtr(i, j)[2] = 0;
                }
            }
        }
        cv.imshow('outcanvas2', mat3);
        mat3.delete();
    };

    const onChangeInpt = () => {
        handleImage().then(img => {
            const src = cv.imread(img);
            origSize = src.size();
            mat = new cv.Mat();
            const dsize = new cv.Size(canvas.width, canvas.height);
            cv.resize(src, mat, dsize, cv.INTER_AREA);
            if (mat.type() == 24) {
                cv.cvtColor(mat, mat, cv.COLOR_RGBA2RGB, 0);
            }
            cv.imshow('canvas', mat);
            src.delete();

            // mask = new cv.Mat(canvas.height, canvas.width, cv.CV_8UC1, new cv.Scalar(cv.GC_PR_BGD));
            mask = new cv.Mat();
            bgdModel = new cv.Mat();
            fgdModel = new cv.Mat();
            cv.grabCut(mat, mask, new cv.Rect(1,1,canvas.width-2, canvas.height-2), bgdModel, fgdModel, 1, cv.GC_INIT_WITH_RECT);
            updateFromMask();

            document.getElementById("download").classList.remove("hide");
        });
    };

    const onClickCanvas = ({target, clientX, clientY}) => {
        if (mat === null) return;
        const {left, top} = target.getBoundingClientRect();
        const x = clientX - left;
        const y = clientY - top;

        if (front.checked) {
            ctx.fillStyle = "red";
            cv.rectangle(mask, new cv.Point(x-3, y-3), new cv.Point(x+3, y+3), new cv.Scalar(cv.GC_FGD), -1);
        }
        else {
            ctx.fillStyle = "blue";
            cv.rectangle(mask, new cv.Point(x-3, y-3), new cv.Point(x+3, y+3), new cv.Scalar(cv.GC_BGD), -1);
        }
        ctx.fillRect(x-3, y-3, 6, 6);
        cv.grabCut(mat, mask, new cv.Rect(), bgdModel, fgdModel, 2, cv.GC_INIT_WITH_MASK);
        updateFromMask();
    };

    const onMouseMove = ({target, clientX, clientY}) => {
        if (mat === null) return;
        const {left, top} = target.getBoundingClientRect();
        const x = clientX - left;
        const y = clientY - top;
        const _ctx = target.getContext("2d");

        _ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (front.checked) {
            _ctx.fillStyle = "rgba(255,0,0,0.5)";
            _ctx.fillRect(x-3, y-3, 6, 6);
        }
        else {
            _ctx.fillStyle = "rgba(0,0,255,0.5)";
            _ctx.fillRect(x-3, y-3, 6, 6);
        }
    }

    function onMouseOut() {
        this.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    }

    function onDownload() {
        const matOut = new cv.Mat();
        cv.cvtColor(mat, matOut, cv.COLOR_RGB2RGBA, 0);
        for (let i = 0; i < canvas.height; i++) {
            for (let j = 0; j < canvas.width; j++) {
                if (mask.ucharPtr(i, j)[0] == 0 || mask.ucharPtr(i, j)[0] == 2) {
                    matOut.ucharPtr(i, j)[0] = 0;
                    matOut.ucharPtr(i, j)[1] = 0;
                    matOut.ucharPtr(i, j)[2] = 0;
                    matOut.ucharPtr(i, j)[3] = 0;
                }
            }
        }
        cv.resize(matOut, matOut, origSize, cv.INTER_AREA);
        cv.imshow('hidden-canvas', matOut);
        matOut.delete();

        document.getElementById("hidden-canvas").toBlob(blob => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            document.body.appendChild(a);
            a.download = "masked.png";
            a.href = url;
            a.click();
            a.remove();
            setTimeout(()=>URL.revokeObjectURL(url), 1);
        });
    }

    inpt.addEventListener("change", onChangeInpt, false);
    layer.addEventListener("click", onClickCanvas, false);
    layer2.addEventListener("click", onClickCanvas, false);
    layer3.addEventListener("click", onClickCanvas, false);
    layer.addEventListener("mousemove", onMouseMove, false);
    layer2.addEventListener("mousemove", onMouseMove, false);
    layer3.addEventListener("mousemove", onMouseMove, false);

    layer.addEventListener("mouseout", onMouseOut, false);
    layer2.addEventListener("mouseout", onMouseOut, false);
    layer3.addEventListener("mouseout", onMouseOut, false);

    document.getElementById("download").addEventListener("click", onDownload, false);
}