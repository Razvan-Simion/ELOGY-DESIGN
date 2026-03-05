/* =========================================
   ELOGY – Jordan (căptușeală) product (single item)
   - poate fi folosit ca produs independent + ca lining în configurator
   Unit: ml (metru liniar)
   ========================================= */

(function () {
  const NS = (window.ELOGY = window.ELOGY || {});
  NS.data = NS.data || {};

  
  NS.data.jordanProduct = {
    id: "acc_jordan_lining",
    category: "accesorii",
    type: "lining",
    appliesTo: ["draperii"],
    title: "Jordan",
    descriptionShort: "Versatil – perdea & draperie. Material hibrid folosit ca lining pentru draperii non-blackout. Disponibil și ca produs separat.",
    images: ["images/acc_jordan_lining/1-JORDAN-01.jpg",
             "images/acc_jordan_lining/2-JORDAN-01.jpg",
             "images/acc_jordan_lining/1-JORDAN-06.jpg",
             "images/acc_jordan_lining/2-JORDAN-06.jpg",
             "images/acc_jordan_lining/1-JORDAN-GY.jpg",
             "images/acc_jordan_lining/2-JORDAN-GY.jpg"
            ],
    pricing: { unit: "ml", value: 35.45, currency: "RON" },
        specs: {
      fabricHeightM: 3.0,

      // opțional (default pentru Jordan standalone)
      defaultColorId: "alb_01",

      colors: [
        {
          id: "alb_01",
          label: "Alb 01",
          images: [
            "images/acc_jordan_lining/1-JORDAN-01.jpg",
            "images/acc_jordan_lining/2-JORDAN-01.jpg",
          ],
        },
        {
          id: "bej_06",
          label: "Bej 06",
          images: [
            "images/acc_jordan_lining/1-JORDAN-06.jpg",
            "images/acc_jordan_lining/2-JORDAN-06.jpg",
          ],
        },
        {
          id: "gri_gy",
          label: "Gri GY",
          images: [
            "images/acc_jordan_lining/1-JORDAN-GY.jpg",
            "images/acc_jordan_lining/2-JORDAN-GY.jpg",
          ],
        },
      ],
    },
    flags: { lining: true },
    status: "active",
    mediaVariant: 2
  };
})();
