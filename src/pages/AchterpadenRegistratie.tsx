import React, { useState } from "react";
import { db, storage } from "../firebase";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

type Props = { onSuccess?: () => void };
const AchterpadenRegistratie: React.FC<Props> = ({ onSuccess }) => {
  const [form, setForm] = useState({
    straat: "",
    wijk: "",
    beschrijving: "",
    typePad: "",
    lengte: "",
    breedte: "",
    eigendom: "",
    toegankelijk: "",
    staat: "",
    obstakels: "",
  });
  const [paden, setPaden] = useState<Array<{ naam: string; huisnummers: string }>>([
    { naam: "Pad 1", huisnummers: "" }
  ]);
  const [media, setMedia] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
  setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleRadio = (name: string, value: string) => {
    setForm({ ...form, [name]: value });
  };

  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setMedia([...media, ...Array.from(e.target.files)]);
  };

  // print action intentionally removed (unused)

  const handlePadChange = (idx: number, field: "naam" | "huisnummers", value: string) => {
    setPaden(paden => paden.map((pad, i) => i === idx ? { ...pad, [field]: value } : pad));
  };

  const handleAddPad = () => {
    setPaden([...paden, { naam: `Pad ${paden.length + 1}`, huisnummers: "" }]);
  };

  const handleRemovePad = (idx: number) => {
    setPaden(paden => paden.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    setSuccess(false);

    // Upload media files to Firebase Storage
    const mediaUrls: string[] = [];
    for (const file of media) {
      const fileRef = ref(storage, `achterpaden/${Date.now()}_${file.name}`);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);
      mediaUrls.push(url);
    }

    // Save form data to Firestore
    await addDoc(collection(db, "achterpaden"), {
      ...form,
      paden,
      media: mediaUrls,
      createdAt: Timestamp.now(),
    });

    setUploading(false);
    setSuccess(true);
    setForm({
      straat: "",
      wijk: "",
      beschrijving: "",
      typePad: "",
      lengte: "",
      breedte: "",
      eigendom: "",
      toegankelijk: "",
      staat: "",
      obstakels: "",
    });
  setMedia([]);
  // Activeer overzicht-tab indien callback meegegeven
  if (onSuccess) onSuccess();
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white dark:bg-dark-surface rounded-xl shadow print:bg-white print:shadow-none print:p-0">
      <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-dark-text-primary">Achterpaden registratie</h1>
  <form className="space-y-6 sm:space-y-8" onSubmit={handleSubmit}>
        {/* Locatie */}
        <div>
          <h2 className="text-lg font-semibold mb-2 text-brand-primary dark:text-brand-primary">Locatie</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="straat" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Straatnaam</label>
              <input id="straat" name="straat" value={form.straat} onChange={handleChange} className="mt-1 border rounded w-full p-2 bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text-primary border-gray-300 dark:border-dark-border" />
            </div>
            <div className="space-y-2">
              <label htmlFor="wijk" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Wijk</label>
              <input id="wijk" name="wijk" value={form.wijk} onChange={handleChange} className="mt-1 border rounded w-full p-2 bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text-primary border-gray-300 dark:border-dark-border" />
            </div>
          </div>
          {/* Huisnummers worden nu per pad toegevoegd, zie dynamische paden hierboven */}
        </div>
        {/* Pad details */}
        <div>
          <h2 className="text-lg font-semibold mb-2 text-brand-primary dark:text-brand-primary">Pad details</h2>
          <div className="space-y-4">
            {paden.map((pad, idx) => (
              <div key={idx} className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                <div className="space-y-2">
                  <label htmlFor={`pad-naam-${idx}`} className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Pad naam</label>
                  <input id={`pad-naam-${idx}`} value={pad.naam} onChange={e => handlePadChange(idx, "naam", e.target.value)} className="mt-1 border rounded w-full p-2 bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text-primary border-gray-300 dark:border-dark-border" />
                </div>
                <div className="space-y-2">
                  <label htmlFor={`pad-huisnummers-${idx}`} className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Huisnummers grenzend aan dit pad</label>
                  <input id={`pad-huisnummers-${idx}`} value={pad.huisnummers} onChange={e => handlePadChange(idx, "huisnummers", e.target.value)} className="mt-1 border rounded w-full p-2 bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text-primary border-gray-300 dark:border-dark-border" />
                </div>
                {paden.length > 1 && (
                  <div className="col-span-2 text-right">
                    <button type="button" onClick={() => handleRemovePad(idx)} className="text-red-600 hover:underline text-sm">Pad verwijderen</button>
                  </div>
                )}
              </div>
            ))}
            <div>
              <button type="button" onClick={handleAddPad} className="px-4 py-1 bg-brand-primary text-white rounded shadow hover:bg-brand-primary/90">Pad toevoegen</button>
            </div>
          </div>
          <div className="mt-4">
            <label htmlFor="beschrijving" className="text-gray-700 dark:text-dark-text-secondary">Beschrijving van het achterpad</label>
            <textarea id="beschrijving" name="beschrijving" value={form.beschrijving} onChange={handleChange} className="border rounded w-full p-2 bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text-primary border-gray-300 dark:border-dark-border" />
          </div>
          <div className="flex gap-4 mt-2">
            <label className="flex items-center gap-2"><input type="radio" name="typePad" checked={form.typePad === "enkel"} onChange={() => handleRadio("typePad", "enkel")} /> Enkel pad</label>
            <label className="flex items-center gap-2"><input type="radio" name="typePad" checked={form.typePad === "doorlopend"} onChange={() => handleRadio("typePad", "doorlopend")} /> Doorlopende paden</label>
            <label className="flex items-center gap-2"><input type="radio" name="typePad" checked={form.typePad === "aangrenzend"} onChange={() => handleRadio("typePad", "aangrenzend")} /> Aangrenzende paden</label>
          </div>
        </div>
        {/* Afmetingen */}
        <div>
          <h2 className="text-lg font-semibold mb-2 text-brand-primary dark:text-brand-primary">Afmetingen</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="lengte" className="text-gray-700 dark:text-dark-text-secondary">Lengte (geschat in meters)</label>
              <input id="lengte" name="lengte" value={form.lengte} onChange={handleChange} className="border rounded w-full p-2 bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text-primary border-gray-300 dark:border-dark-border" />
            </div>
            <div>
              <label htmlFor="breedte" className="text-gray-700 dark:text-dark-text-secondary">Breedte (geschat in meters)</label>
              <input id="breedte" name="breedte" value={form.breedte} onChange={handleChange} className="border rounded w-full p-2 bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text-primary border-gray-300 dark:border-dark-border" />
            </div>
          </div>
        </div>
        {/* Eigendom & Toegankelijkheid */}
        <div>
          <h2 className="text-lg font-semibold mb-2 text-brand-primary dark:text-brand-primary">Eigendom & Toegankelijkheid</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4 bg-gray-50 dark:bg-dark-bg rounded-lg border border-gray-200 dark:border-dark-border">
            {/* Eigendom */}
            <div>
              <div className="font-medium mb-2 text-gray-700 dark:text-dark-text-secondary">Eigendom</div>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2">
                  <input type="radio" name="eigendom" checked={form.eigendom === "huur"} onChange={() => handleRadio("eigendom", "huur")} />
                  Huur
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" name="eigendom" checked={form.eigendom === "particulier"} onChange={() => handleRadio("eigendom", "particulier")} />
                  Particulier
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" name="eigendom" checked={form.eigendom === "huur_en_particulier"} onChange={() => handleRadio("eigendom", "huur_en_particulier")} />
                  Huur en Particulier
                </label>
              </div>
            </div>
            {/* Toegankelijkheid */}
            <div>
              <div className="font-medium mb-2 text-gray-700 dark:text-dark-text-secondary">Toegankelijkheid</div>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2"><input type="radio" name="toegankelijk" checked={form.toegankelijk === "ja"} onChange={() => handleRadio("toegankelijk", "ja")} /> Toegankelijk</label>
                <label className="flex items-center gap-2"><input type="radio" name="toegankelijk" checked={form.toegankelijk === "nee"} onChange={() => handleRadio("toegankelijk", "nee")} /> Niet toegankelijk</label>
              </div>
            </div>
            {/* Staat */}
            <div>
              <div className="font-medium mb-2 text-gray-700 dark:text-dark-text-secondary">Staat van het pad</div>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2">
                  <input type="radio" name="staat" checked={form.staat === "goed"} onChange={() => handleRadio("staat", "goed")} />
                  <span>Goed</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" name="staat" checked={form.staat === "matig"} onChange={() => handleRadio("staat", "matig")} />
                  <span>Matig</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" name="staat" checked={form.staat === "slecht"} onChange={() => handleRadio("staat", "slecht")} />
                  <span>Slecht</span>
                </label>
              </div>
            </div>
          </div>
        </div>
        {/* Obstakels */}
        <div>
          <h2 className="text-lg font-semibold mb-2 text-brand-primary dark:text-brand-primary">Obstakels of bijzonderheden</h2>
          <label htmlFor="obstakels" className="text-gray-700 dark:text-dark-text-secondary">Obstakels of bijzonderheden</label>
          <textarea id="obstakels" name="obstakels" value={form.obstakels} onChange={handleChange} className="border rounded w-full p-2 bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text-primary border-gray-300 dark:border-dark-border" />
        </div>
        {/* Media */}
        <div>
          <h2 className="text-lg font-semibold mb-2 text-brand-primary dark:text-brand-primary">Foto&apos;s/Filmpjes toevoegen</h2>
          <input type="file" accept="image/*,video/*" multiple onChange={handleMediaChange} className="block" />
          <div className="flex flex-wrap gap-2 mt-2">
            {media.map((file, idx) =>
              file.type.startsWith("image/") ? (
                <div key={idx} className="relative group">
                  <img src={URL.createObjectURL(file)} alt={file.name} className="h-20 w-20 object-cover rounded border border-gray-200 dark:border-dark-border" />
                  <span className="absolute top-1 right-1 bg-black bg-opacity-60 text-white text-xs px-2 py-0.5 rounded opacity-0 group-hover:opacity-100">{file.name}</span>
                </div>
              ) : (
                <div key={idx} className="relative group">
                  <video controls aria-label="Bijlage video" className="h-20 w-20 rounded border border-gray-200 dark:border-dark-border">
                    <source src={URL.createObjectURL(file)} type={file.type} />
                    {/* captions TODO */}
                    <track kind="captions" src="" />
                  </video>
                  <span className="absolute top-1 right-1 bg-black bg-opacity-60 text-white text-xs px-2 py-0.5 rounded opacity-0 group-hover:opacity-100">{file.name}</span>
                </div>
              )
            )}
          </div>
        </div>
        {/* Acties */}
        <div className="flex items-center gap-4 mt-8">
          <button
            type="submit"
            disabled={uploading}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded shadow print:hidden transition"
          >
            {uploading ? "Opslaan..." : "Opslaan"}
          </button>
        </div>
        {success && (
          <div className="mt-4 text-green-700 dark:text-green-400 font-semibold">
            Formulier succesvol opgeslagen!
          </div>
        )}
      </form>
    </div>
  );
};

export default AchterpadenRegistratie;
