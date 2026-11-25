/* =====================================================================
   STORAGE LAYER – Supabase version (shared by index.html and admin.html)
   1) Create a free project at supabase.com
   2) Project Settings -> API: copy the Project URL and the "anon public" key
   3) Paste them below, then run supabase-setup.sql in the SQL Editor
   ===================================================================== */
const SUPABASE_URL = "PASTE_YOUR_PROJECT_URL_HERE";   // e.g. https://abcd1234.supabase.co
const SUPABASE_ANON_KEY = "PASTE_YOUR_ANON_PUBLIC_KEY_HERE";
const BUCKET = "documentation";

const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ---------- Participants: submit only ---------- */
async function addSubmission(s) {
   const paths = [];
   for (let i = 0; i < s.photos.length; i++) {
      const blob = await (await fetch(s.photos[i])).blob();
      const path = `${s.id}/${i + 1}.jpg`;
      const { error } = await db.storage.from(BUCKET).upload(path, blob, { contentType: "image/jpeg" });
      if (error) throw error;
      paths.push(path);
   }
   const { error } = await db.from("submissions").insert({
      id: s.id, name: s.name, age: s.age ? +s.age : null, contact: s.contact,
      grade_section: s.gradeSection, activity: s.activity, date: s.date || null,
      role: s.role, notes: s.notes, photo_paths: paths, status: "Pending", created: s.created
   });
   if (error) throw error;
   return s;
}

/* ---------- Admin only (needs login) ---------- */
async function listSubmissions() {
   const { data, error } = await db.from("submissions").select("*").order("created", { ascending: false });
   if (error) throw error;
   const allPaths = data.flatMap(r => r.photo_paths || []);
   const urlMap = {};
   if (allPaths.length) {
      const { data: signed, error: e2 } = await db.storage.from(BUCKET).createSignedUrls(allPaths, 3600);
      if (e2) throw e2;
      signed.forEach(x => urlMap[x.path] = x.signedUrl);
   }
   return data.map(r => ({
      id: r.id, name: r.name, age: r.age, contact: r.contact, gradeSection: r.grade_section,
      activity: r.activity, date: r.date, role: r.role, notes: r.notes, status: r.status, created: r.created,
      photos: (r.photo_paths || []).map(p => urlMap[p]).filter(Boolean)
   }));
}
async function updateSubmission(id, patch) {
   const { error } = await db.from("submissions").update(patch).eq("id", id);
   if (error) throw error;
}
async function deleteSubmission(id) {
   const { data } = await db.from("submissions").select("photo_paths").eq("id", id).single();
   if (data && data.photo_paths && data.photo_paths.length) await db.storage.from(BUCKET).remove(data.photo_paths);
   const { error } = await db.from("submissions").delete().eq("id", id);
   if (error) throw error;
}

/* ---------- Admin login ---------- */
async function adminLogin(email, password) {
   const { error } = await db.auth.signInWithPassword({ email, password });
   if (error) throw error;
}
async function adminLogout() { await db.auth.signOut(); }
async function isAdminLoggedIn() { const { data } = await db.auth.getSession(); return !!data.session; }