/**
 * ============================================================
 * ZENDER237 - CSV TARIFF PARSER
 * ============================================================
 *
 * Formats acceptés :
 *
 * 1. CSV canonique :
 *
 * country_a,country_b,min_amount,max_amount,fee_amount
 *
 * 2. CSV à 3 colonnes issu du template :
 *
 * min_amount,max_amount,fee_amount
 *
 * Dans ce cas, le trajet est déduit du nom du fichier :
 *
 * Mali_Cameroun.csv
 * Guinee_Cameroun.csv
 * ============================================================
 */


/* ============================================================
 * ALIAS DES COLONNES
 * ============================================================ */

const HEADER_ALIASES = {

  country_a: [
    'country_a',
    'countrya',
    'pays_a',
    'paysa',
    'source_country',
    'from_country',
  ],

  country_b: [
    'country_b',
    'countryb',
    'pays_b',
    'paysb',
    'destination_country',
    'to_country',
  ],

  min_amount: [
    'min_amount',
    'minimum',
    'min',
    'montant_minimum',
    'montant_min',
    'minimum_amount',
  ],

  max_amount: [
    'max_amount',
    'maximum',
    'max',
    'montant_maximum',
    'montant_max',
    'maximum_amount',
  ],

  fee_amount: [
    'fee_amount',
    'fee',
    'frais',
    'frais_transfert',
    'transfer_fee',
    'frais_amount',
  ],

};


/* ============================================================
 * NORMALISATION HEADER
 * ============================================================ */

function normalizeHeader(
  value
) {

  return String(
    value || ''
  )
    .trim()
    .toLowerCase()
    .normalize(
      'NFD'
    )
    .replace(
      /[\u0300-\u036f]/g,
      ''
    )
    .replace(
      /[^a-z0-9]+/g,
      '_'
    )
    .replace(
      /^_+|_+$/g,
      ''
    );
}


/* ============================================================
 * NORMALISATION PAYS
 * ============================================================ */

function normalizeCountry(
  value
) {

  return String(
    value || ''
  )
    .trim()
    .toLowerCase()
    .normalize(
      'NFD'
    )
    .replace(
      /[\u0300-\u036f]/g,
      ''
    )
    .replace(
      /[^a-z0-9]+/g,
      '_'
    )
    .replace(
      /^_+|_+$/g,
      ''
    );
}


/* ============================================================
 * CSV LINE PARSER
 * ============================================================ */

function parseCsvLine(
  line,
  delimiter
) {

  const result = [];

  let current = '';

  let quoted =
    false;


  for (
    let i = 0;
    i < line.length;
    i += 1
  ) {

    const char =
      line[i];

    const next =
      line[i + 1];


    if (
      char === '"'
    ) {

      if (
        quoted &&
        next === '"'
      ) {

        current += '"';

        i += 1;

      } else {

        quoted =
          !quoted;
      }

      continue;
    }


    if (
      char === delimiter &&
      !quoted
    ) {

      result.push(
        current.trim()
      );

      current = '';

      continue;
    }


    current += char;
  }


  result.push(
    current.trim()
  );


  return result;
}


/* ============================================================
 * DETECTION DELIMITER
 * ============================================================ */

function detectDelimiter(
  line
) {

  const commaCount =
    (
      line.match(
        /,/g
      ) || []
    ).length;


  const semicolonCount =
    (
      line.match(
        /;/g
      ) || []
    ).length;


  return semicolonCount >
    commaCount
    ? ';'
    : ',';
}


/* ============================================================
 * PARSE NUMBER
 * ============================================================ */

function parseAmount(
  value
) {

  let raw =
    String(
      value ?? ''
    )
      .trim()
      .replace(
        /\u00a0/g,
        ''
      )
      .replace(
        /U|XAF|CFA|F[_ -]?CFA/gi,
        ''
      )
      .replace(
        /'/g,
        ''
      )
      .trim();


  if (!raw) {
    return NaN;
  }


  /*
   * Virgule décimale :
   *
   * 10,50
   */
  if (
    /^[-+]?\d+,\d{1,2}$/
      .test(raw)
  ) {

    raw =
      raw.replace(
        ',',
        '.'
      );

  } else {

    /*
     * Virgules utilisées comme
     * séparateurs de milliers.
     */
    raw =
      raw.replace(
        /,/g,
        ''
      );
  }


  raw =
    raw.replace(
      /\s/g,
      ''
    );


  const number =
    Number(raw);


  return Number.isFinite(
    number
  )
    ? number
    : NaN;
}


/* ============================================================
 * INFERENCE DU TRAJET VIA LE NOM DU FICHIER
 * ============================================================ */

function inferCountriesFromFilename(
  filename
) {

  const base =
    String(
      filename || ''
    )
      .replace(
        /\\/g,
        '/'
      )
      .split('/')
      .pop()
      .replace(
        /\.[^.]+$/,
        ''
      )
      .trim();


  const normalized =
    base
      .replace(
        /[–—]/g,
        '-'
      )
      .replace(
        /\s+to\s+/gi,
        '-'
      )
      .replace(
        /\s*[-_]\s*/g,
        '_'
      )
      .replace(
        /\s+/g,
        '_'
      );


  const parts =
    normalized
      .split('_')
      .map(
        normalizeCountry
      )
      .filter(Boolean);


  if (
    parts.length >= 2
  ) {

    return {

      countryA:
        parts[0],

      countryB:
        parts
          .slice(1)
          .join('_'),
    };
  }


  return {
    countryA: '',
    countryB: '',
  };
}


/* ============================================================
 * FIND HEADER
 * ============================================================ */

function findHeaderIndex(
  headers,
  aliases
) {

  const normalized =
    headers.map(
      normalizeHeader
    );


  for (
    const alias of aliases
  ) {

    const index =
      normalized.indexOf(
        alias
      );


    if (
      index !== -1
    ) {
      return index;
    }
  }


  return -1;
}


/* ============================================================
 * HEADER MAP
 * ============================================================ */

function buildHeaderMap(
  headers
) {

  return {

    country_a:
      findHeaderIndex(
        headers,
        HEADER_ALIASES.country_a
      ),

    country_b:
      findHeaderIndex(
        headers,
        HEADER_ALIASES.country_b
      ),

    min_amount:
      findHeaderIndex(
        headers,
        HEADER_ALIASES.min_amount
      ),

    max_amount:
      findHeaderIndex(
        headers,
        HEADER_ALIASES.max_amount
      ),

    fee_amount:
      findHeaderIndex(
        headers,
        HEADER_ALIASES.fee_amount
      ),
  };
}


/* ============================================================
 * PARSE CSV PRINCIPAL
 * ============================================================ */

export function parseTariffCsv(
  text,
  filename = ''
) {

  const cleaned =
    String(
      text || ''
    )
      .replace(
        /^\uFEFF/,
        ''
      )
      .replace(
        /\r\n/g,
        '\n'
      )
      .replace(
        /\r/g,
        '\n'
      );


  const lines =
    cleaned
      .split('\n')
      .map(
        (line) =>
          line.trim()
      )
      .filter(
        Boolean
      );


  if (
    lines.length === 0
  ) {

    return {

      rows: [],

      errors: [
        'Le fichier CSV est vide.',
      ],

      hasHeader: false,
    };
  }


  const delimiter =
    detectDelimiter(
      lines[0]
    );


  const parsed =
    lines.map(
      (line) =>
        parseCsvLine(
          line,
          delimiter
        )
    );


  const firstRow =
    parsed[0];


  const firstHeaderMap =
    buildHeaderMap(
      firstRow
    );


  const hasHeader = [
    firstHeaderMap.country_a,
    firstHeaderMap.country_b,
    firstHeaderMap.min_amount,
    firstHeaderMap.max_amount,
    firstHeaderMap.fee_amount,
  ].some(
    (index) =>
      index !== -1
  );


  const inferred =
    inferCountriesFromFilename(
      filename
    );


  const rows = [];

  const errors = [];


  const headerMap =
    hasHeader
      ? firstHeaderMap
      : null;


  const startIndex =
    hasHeader
      ? 1
      : 0;


  /* ==========================================================
   * VALIDATION HEADER
   * ========================================================== */

  if (
    hasHeader
  ) {

    const required = [
      'min_amount',
      'max_amount',
      'fee_amount',
    ];


    const missing =
      required.filter(
        (field) =>
          headerMap[field] === -1
      );


    if (
      missing.length > 0
    ) {

      errors.push(
        `Colonnes obligatoires manquantes : ${missing.join(', ')}`
      );


      return {
        rows: [],
        errors,
        hasHeader,
      };
    }
  }


  /* ==========================================================
   * CSV SANS HEADER
   * ========================================================== */

  if (
    !hasHeader &&
    firstRow.length !== 3 &&
    firstRow.length !== 5
  ) {

    errors.push(
      'Sans en-tête, le CSV doit contenir 3 colonnes (min,max,frais) ou 5 colonnes (pays A,pays B,min,max,frais).'
    );


    return {
      rows: [],
      errors,
      hasHeader,
    };
  }


  if (
    !hasHeader &&
    firstRow.length === 3 &&
    (
      !inferred.countryA ||
      !inferred.countryB
    )
  ) {

    errors.push(
      'Pour un CSV à 3 colonnes, le nom du fichier doit indiquer le trajet, par exemple Mali_Cameroun.csv.'
    );


    return {
      rows: [],
      errors,
      hasHeader,
    };
  }


  const duplicateKeys =
    new Set();


  /* ==========================================================
   * LIGNES
   * ========================================================== */

  for (
    let i = startIndex;
    i < parsed.length;
    i += 1
  ) {

    const values =
      parsed[i];


    const lineNumber =
      i + 1;


    if (
      !values.some(
        (value) =>
          String(
            value
          ).trim() !== ''
      )
    ) {
      continue;
    }


    let countryA = '';

    let countryB = '';

    let minValue;

    let maxValue;

    let feeValue;


    /* --------------------------------------------------------
     * AVEC HEADER
     * -------------------------------------------------------- */

    if (
      hasHeader
    ) {

      countryA =
        normalizeCountry(
          values[
            headerMap.country_a
          ] || ''
        );


      countryB =
        normalizeCountry(
          values[
            headerMap.country_b
          ] || ''
        );


      minValue =
        parseAmount(
          values[
            headerMap.min_amount
          ]
        );


      maxValue =
        parseAmount(
          values[
            headerMap.max_amount
          ]
        );


      feeValue =
        parseAmount(
          values[
            headerMap.fee_amount
          ]
        );
    }


    /* --------------------------------------------------------
     * 3 COLONNES
     * -------------------------------------------------------- */

    else if (
      values.length === 3
    ) {

      countryA =
        inferred.countryA;

      countryB =
        inferred.countryB;

      minValue =
        parseAmount(
          values[0]
        );

      maxValue =
        parseAmount(
          values[1]
        );

      feeValue =
        parseAmount(
          values[2]
        );
    }


    /* --------------------------------------------------------
     * 5 COLONNES
     * -------------------------------------------------------- */

    else {

      countryA =
        normalizeCountry(
          values[0]
        );

      countryB =
        normalizeCountry(
          values[1]
        );

      minValue =
        parseAmount(
          values[2]
        );

      maxValue =
        parseAmount(
          values[3]
        );

      feeValue =
        parseAmount(
          values[4]
        );
    }


    const lineErrors = [];


    if (!countryA) {
      lineErrors.push(
        'pays A absent'
      );
    }


    if (!countryB) {
      lineErrors.push(
        'pays B absent'
      );
    }


    if (
      !Number.isFinite(
        minValue
      ) ||
      minValue < 0
    ) {

      lineErrors.push(
        'minimum invalide'
      );
    }


    if (
      !Number.isFinite(
        maxValue
      ) ||
      maxValue <= 0
    ) {

      lineErrors.push(
        'maximum invalide'
      );
    }


    if (
      Number.isFinite(
        minValue
      ) &&
      Number.isFinite(
        maxValue
      ) &&
      minValue >= maxValue
    ) {

      lineErrors.push(
        'minimum doit être inférieur au maximum'
      );
    }


    if (
      !Number.isFinite(
        feeValue
      ) ||
      feeValue < 0
    ) {

      lineErrors.push(
        'frais invalides'
      );
    }


    if (
      lineErrors.length > 0
    ) {

      errors.push(
        `Ligne ${lineNumber} : ${lineErrors.join(', ')}.`
      );

      continue;
    }


    const row = {

      country_a:
        countryA,

      country_b:
        countryB,

      min_amount:
        minValue,

      max_amount:
        maxValue,

      fee_amount:
        feeValue,
    };


    const duplicateKey = [
      row.country_a,
      row.country_b,
      row.min_amount,
      row.max_amount,
    ].join('|');


    if (
      duplicateKeys.has(
        duplicateKey
      )
    ) {

      errors.push(
        `Ligne ${lineNumber} : doublon de tranche pour ${countryA} → ${countryB}.`
      );

      continue;
    }


    duplicateKeys.add(
      duplicateKey
    );


    rows.push(
      row
    );
  }


  if (
    rows.length === 0 &&
    errors.length === 0
  ) {

    errors.push(
      'Aucune ligne tarifaire exploitable n’a été trouvée.'
    );
  }


  return {

    rows,

    errors,

    hasHeader,

    delimiter,
  };
}