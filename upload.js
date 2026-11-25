/* Participant page logic */
const $ = s => document.querySelector(s);
const MAX = 6;
let photos = [];   // array of data URLs

function toast(t) { const e = $("#toast"); e.textContent = t; e.classList.remove("hide"); setTimeout(() => e.classList.add("hide"), 2500); }

// Resize each photo so storage stays small.
// TODO: with a real backend, upload the original file instead and keep the returned URL.
function shrink(file) {
  return new Promise(res => {
    const img = new Image();
    img.onload = () => {
      const m = 1000, s = Math.min(1, m / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = img.width * s; c.height = img.height * s;
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      res(c.toDataURL("image/jpeg", .72));
    };
    img.src = URL.createObjectURL(file);
  });
}

function paint() {
  const t = $("#thumbs"); t.textContent = "";
  photos.forEach((p, i) => {
    const d = document.createElement("div"); d.className = "thumb"; d.style.backgroundImage = `url(${p})`;
    const x = document.createElement("button"); x.type = "button"; x.textContent = "✕";
    x.onclick = () => { photos.splice(i, 1); paint(); };
    d.append(x); t.append(d);
  });
}

$("#drop").onclick = () => $("#file").click();
$("#file").onchange = async e => {
  for (const f of e.target.files) {
    if (photos.length >= MAX) { toast("Maximum of " + MAX + " photos."); break; }
    photos.push(await shrink(f));
  }
  e.target.value = ""; paint();
};

$("#form").onsubmit = async e => {
  e.preventDefault();
  if (!photos.length) { toast("Please upload at least one photo."); return; }
  const f = Object.fromEntries(new FormData(e.target));
  const id = "SK-" + Math.random().toString(36).slice(2, 8).toUpperCase();
  const sub = { id, ...f, photos, status: "Pending", created: Date.now() };
  $("#send").disabled = true;
  try {
    await addSubmission(sub);
    $("#form").classList.add("hide"); $("#done").classList.remove("hide"); $("#ref").textContent = id;
  } catch (err) {
    console.error(err); toast("Couldn't save (storage full?). Try fewer photos.");
  }
  $("#send").disabled = false;
};

$("#again").onclick = () => {
  photos = []; paint(); $("#form").reset();
  $("#done").classList.add("hide"); $("#form").classList.remove("hide");
};