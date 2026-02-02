/* =========================================
   ELOGY – Accesorii products (demo set)
   ========================================= */

(function () {
  const NS = (window.ELOGY = window.ELOGY || {});
  NS.data = NS.data || {};

  // NOTE:
  // - pricing.unit: "mp" | "buc" | "set"
  // - type: underlay | plinte | adezivi | sine_kit | galerie_bara | galerie_accesorii
  // - appliesTo: mocheta | perdele | draperii | universal
  NS.data.accesoriiProducts = [
    {
      id: "acc_underlay_08",
      category: "accesorii",
      type: "underlay",
      appliesTo: ["mocheta", "universal"],
      title: "Underlay 0.8 mm",
      descriptionShort: "Strat suport pentru confort și protecție. Pentru mochetă (și utilizări universale).",
      images: [],
      pricing: { unit: "mp", value: 18.5, currency: "RON" },
      specs: { thicknessMm: 0.8, widthM: 1.37 },
      status: "active",
      mediaVariant: 1
    },
    {
      id: "acc_plinta_pvc",
      category: "accesorii",
      type: "plinte",
      appliesTo: ["mocheta", "universal"],
      title: "Plintă PVC specială",
      descriptionShort: "Finisaj curat la perete. Lungime standard informativă.",
      images: [],
      pricing: { unit: "buc", value: 24, currency: "RON" },
      specs: { lengthMl: 2.5, material: "PVC" },
      status: "active",
      mediaVariant: 2
    },
    {
      id: "acc_adeziv_mocheta",
      category: "accesorii",
      type: "adezivi",
      appliesTo: ["mocheta"],
      title: "Adeziv mochetă",
      descriptionShort: "Aderență bună și aplicare uniformă. Acoperire informativă.",
      images: [],
      pricing: { unit: "buc", value: 89.99, currency: "RON" },
      specs: { coverageMp: 25 },
      status: "active",
      mediaVariant: 3
    },
    {
      id: "acc_sina_kit_2m",
      category: "accesorii",
      type: "sine_kit",
      appliesTo: ["perdele", "draperii", "universal"],
      title: "Șină aluminiu – kit 2.0 m",
      descriptionShort: "Sistem discret, kit complet pentru montaj. Dimensiune demo 2.0 m.",
      images: [],
      pricing: { unit: "buc", value: 145, currency: "RON" },
      specs: { lengthM: 2.0, material: "Aluminiu" },
      status: "active",
      mediaVariant: 1
    },
    {
      id: "acc_galerie_bara_2m",
      category: "accesorii",
      type: "galerie_bara",
      appliesTo: ["perdele", "draperii"],
      title: "Bară galerie 2.0 m",
      descriptionShort: "Profil clasic/premium. Dimensiune demo 2.0 m.",
      images: [],
      pricing: { unit: "buc", value: 210, currency: "RON" },
      specs: { lengthM: 2.0, material: "Metal" },
      status: "active",
      mediaVariant: 2
    },
    {
      id: "acc_inele_set_10",
      category: "accesorii",
      type: "galerie_accesorii",
      appliesTo: ["perdele", "draperii", "universal"],
      title: "Inele galerie (set)",
      descriptionShort: "Set 10 bucăți. Pentru glisare fluentă și aspect uniform.",
      images: [],
      pricing: { unit: "set", value: 39, currency: "RON" },
      specs: { piecesPerSet: 10 },
      status: "active",
      mediaVariant: 3
    }
  ];
})();
