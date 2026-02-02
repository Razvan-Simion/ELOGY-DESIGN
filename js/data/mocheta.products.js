/* =========================================
   ELOGY – Mochetă products (DEMO)
   - înlocuiești ulterior cu produsele reale
   ========================================= */

(function () {
  const NS = (window.ELOGY = window.ELOGY || {});
  NS.data = NS.data || {};

  NS.data.mochetaProducts = [
    {
      id: "mch-rola-01",
      title: "Mochetă Model 01",
      subtype: "rola",
      destination: ["domestic", "intens"],
      pricePerSqm: 79.5,
      short: "Textură densă, aspect modern.",
      mediaVariant: 1
    },
    {
      id: "mch-rola-02",
      title: "Mochetă Model 02",
      subtype: "rola",
      destination: ["horeca", "intens"],
      pricePerSqm: 92,
      short: "Recomandată pentru trafic ridicat.",
      mediaVariant: 2
    },
    {
      id: "mch-rola-03",
      title: "Mochetă Model 03",
      subtype: "rola",
      destination: ["birouri", "intens"],
      pricePerSqm: 88.25,
      short: "Finisaj profesional, ușor de întreținut.",
      mediaVariant: 3
    },

    {
      id: "mch-trv-01",
      title: "Traversă Model 01",
      subtype: "traversa",
      destination: ["domestic"],
      byWidth: [
        { widthCm: 67, pricePerMl: 39 },
        { widthCm: 80, pricePerMl: 44.5 },
        { widthCm: 100, pricePerMl: 52 }
      ],
      short: "Potrivită pentru holuri și zone de acces.",
      mediaVariant: 2
    },
    {
      id: "mch-trv-02",
      title: "Traversă Model 02",
      subtype: "traversa",
      destination: ["intens", "birouri"],
      byWidth: [
        { widthCm: 80, pricePerMl: 58 },
        { widthCm: 100, pricePerMl: 69.99 }
      ],
      short: "Rezistență bună la utilizare frecventă.",
      mediaVariant: 1
    },
    {
      id: "mch-trv-03",
      title: "Traversă Model 03",
      subtype: "traversa",
      destination: ["exterior"],
      byWidth: [
        { widthCm: 80, pricePerMl: 61 },
        { widthCm: 100, pricePerMl: 74 }
      ],
      short: "Opțiune robustă pentru zone semi-exterioare.",
      mediaVariant: 3
    }
  ];
})();
