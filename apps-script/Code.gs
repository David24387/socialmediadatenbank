const ROOT_FOLDER_ID = '1JYjGP0o9h531VFepYOD5i_hwRMn6evAT';


/* =========================================================
   WEB APP
   ========================================================= */

const SNAPSHOT_KEY = 'SOCIAL_DATABASE_SNAPSHOT_V1';

// Visitors only read the prepared list; no folder scan or ZIP processing.
function doGet(e) {
  const params = e && e.parameter || {};
  const compactId = PropertiesService.getScriptProperties().getProperty(SNAPSHOT_KEY + '_COMPACT');
  if ((params.view === 'compact' || params.preview) && compactId) {
    const compact = readIndexFile_(compactId);
    if (params.preview) {
      const item = JSON.parse(compact).content.find(function(x) { return String(x.id) === String(params.preview); });
      if (!item || !item.previewDataId) return jsonOutput_(JSON.stringify({error: 'PREVIEW_NOT_FOUND'}));
      return jsonOutput_(DriveApp.getFileById(item.previewDataId).getBlob().getDataAsString('UTF-8'));
    }
    return jsonOutput_(compact);
  }
  if (params.preview) return jsonOutput_(JSON.stringify({error: 'PREVIEW_NOT_READY'}));
  const saved = readSnapshot_();
  if (!saved) return jsonOutput_(JSON.stringify({error: 'NOT_INITIALIZED', message: 'Bitte setupDatabase einmal im Script-Editor ausführen.'}));
  return jsonOutput_(saved);
}

function jsonOutput_(text) {
  return ContentService.createTextOutput(text).setMimeType(ContentService.MimeType.JSON);
}

function readSnapshot_() {
  const id = PropertiesService.getScriptProperties().getProperty(SNAPSHOT_KEY);
  return id ? DriveApp.getFileById(id).getBlob().getDataAsString('UTF-8') : null;
}

// Cache is optional; eviction or size limits always fall back to the index file.
function readIndexFile_(id) {
  const key = 'compact:' + id;
  try {
    const hit = CacheService.getScriptCache().get(key);
    if (hit) return hit;
  } catch (error) {}
  const text = DriveApp.getFileById(id).getBlob().getDataAsString('UTF-8');
  try {
    if (Utilities.newBlob(text).getBytes().length < 90000) CacheService.getScriptCache().put(key, text, 300);
  } catch (error) {}
  return text;
}

// Run once manually and authorize. Re-running does not duplicate triggers.
function setupDatabase() {
  refreshDatabase();
  const exists = ScriptApp.getProjectTriggers().some(function(t) {
    return t.getHandlerFunction() === 'refreshDatabase';
  });
  if (!exists) ScriptApp.newTrigger('refreshDatabase').timeBased().everyMinutes(5).create();
}

function refreshDatabase() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return;
  try {
    const saved = readSnapshot_();
    const previous = saved ? JSON.parse(saved) : {content: []};
    const result = buildDatabase_(previous);
    // Keep the legacy response compatible; the website requests the small index.
    const oldById = new Map(previous.content.map(function(x) { return [x.id, x]; }));
    result.content.forEach(function(item) {
      if (item.format !== 'Carousel' || !/^data:image\//.test(item.preview || '')) return;
      const old = oldById.get(item.id);
      if (old && old.previewDataId && old.modified === item.modified && old.preview === item.preview) {
        item.previewDataId = old.previewDataId;
      } else {
        item.previewDataId = DriveApp.createFile(Utilities.newBlob(
          JSON.stringify({preview: item.preview}), 'application/json', 'Social-Media-Vorschau-' + item.id + '.json'
        )).getId();
      }
    });
    const compact = {updatedAt: result.updatedAt, content: result.content.map(function(item) {
      const entry = Object.assign({}, item);
      if (entry.previewDataId) { entry.preview = ''; entry.previewDeferred = true; }
      return entry;
    })};
    const compactFile = DriveApp.createFile(Utilities.newBlob(JSON.stringify(compact), 'application/json', 'Social-Media-Datenbank-Kompakt.json'));
    const text = JSON.stringify(result);
    // Create a complete replacement before publishing its ID.
    const fresh = DriveApp.createFile(Utilities.newBlob(text, 'application/json', 'Social-Media-Datenbank-Index.json'));
    const props = PropertiesService.getScriptProperties();
    const oldId = props.getProperty(SNAPSHOT_KEY);
    props.setProperty(SNAPSHOT_KEY, fresh.getId());
    const oldCompact = props.getProperty(SNAPSHOT_KEY + '_COMPACT');
    props.setProperty(SNAPSHOT_KEY + '_COMPACT', compactFile.getId());
    const retiredCompact = props.getProperty(SNAPSHOT_KEY + '_COMPACT_PREVIOUS');
    if (oldCompact) props.setProperty(SNAPSHOT_KEY + '_COMPACT_PREVIOUS', oldCompact);
    if (retiredCompact) {
      try { DriveApp.getFileById(retiredCompact).setTrashed(true); } catch (error) { console.warn(error); }
    }
    // Retain the preceding generation: an in-flight request may still read it.
    const retiredId = props.getProperty(SNAPSHOT_KEY + '_PREVIOUS');
    if (oldId) props.setProperty(SNAPSHOT_KEY + '_PREVIOUS', oldId);
    if (retiredId) {
      try { DriveApp.getFileById(retiredId).setTrashed(true); }
      catch (error) { console.warn('Alter Index konnte nicht aufgeräumt werden: ' + error); }
    }
  } finally { lock.releaseLock(); }
}

/* =========================================================
   DATENBANK ERZEUGEN
   ========================================================= */

function buildDatabase_(previous) {
  const previousById = new Map((previous.content || []).map(function(x) { return [x.id, x]; }));

  const root = DriveApp.getFolderById(ROOT_FOLDER_ID);

  const result = {
    updatedAt: new Date().toISOString(),
    content: []
  };

  const folders = root.getFolders();

  while (folders.hasNext()) {

    const folder = folders.next();

    const folderName = folder.getName().trim();
    const folderKey = folderName.toLowerCase();


    // -----------------------------------------------------
    // CAROUSELS
    // -----------------------------------------------------

    if (
      folderKey === 'carousel' ||
      folderKey === 'carousels'
    ) {

      readCarouselFolder(
        folder,
        result,
        previousById
      );

      continue;
    }


    // -----------------------------------------------------
    // NORMALE KANÄLE
    // -----------------------------------------------------

    if (
      folderKey === 'instagram' ||
      folderKey === 'facebook' ||
      folderKey === 'linkedin' ||
      folderKey === 'reels'
    ) {

      readPlatformFolder(
        folder,
        folderKey,
        result
      );
    }
  }


  // -----------------------------------------------------
  // NEUESTE INHALTE ZUERST
  // -----------------------------------------------------

  result.content.sort(function(a, b) {

    return String(b.modified || '')
      .localeCompare(
        String(a.modified || '')
      );

  });


  return result;
}


/* =========================================================
   NORMALE POSTS
   ========================================================= */

function readPlatformFolder(
  folder,
  folderKey,
  result
) {

  const files = folder.getFiles();

  while (files.hasNext()) {

    const file = files.next();

    if (!isMediaFile(file)) {
      continue;
    }


    const mimeType =
      file.getMimeType();

    const video =
      mimeType.startsWith('video/');


    let platforms = [
      folderKey
    ];

    let format = 'Bild';


    // -----------------------------------------------------
    // REELS
    // -----------------------------------------------------

    if (folderKey === 'reels') {

      platforms = [
        'instagram',
        'facebook'
      ];

      format = 'Reel';

    }

    else if (video) {

      format = 'Video';

    }


    result.content.push({

      id:
        file.getId(),

      name:
        file.getName(),

      title:
        createTitle(
          file.getName()
        ),

      platforms:
        platforms,

      format:
        format,

      mimeType:
        mimeType,

      preview:
        getThumbnailUrl(file),

      video:
        video
          ? getVideoUrl(file)
          : null,

      download:
        getDownloadUrl(file),

      modified:
        file
          .getLastUpdated()
          .toISOString()

    });
  }
}


/* =========================================================
   CAROUSELS AUS ZIP-DATEIEN
   ========================================================= */

function readCarouselFolder(
  carouselRoot,
  result,
  previousById
) {

  const files =
    carouselRoot.getFiles();


  while (files.hasNext()) {

    const file =
      files.next();

    const fileName =
      file.getName();


    // -----------------------------------------------------
    // NUR ZIP-DATEIEN
    // -----------------------------------------------------

    if (!isZipFile(file)) {
      continue;
    }


    const previousItem = previousById.get(file.getId());
    const modified = file.getLastUpdated().toISOString();
    if (previousItem && previousItem.modified === modified && previousItem.name === fileName && previousItem.format === 'Carousel') {
      result.content.push(previousItem);
      continue;
    }
    try {

      // ---------------------------------------------------
      // ZIP LADEN UND ENTPACKEN
      // ---------------------------------------------------

      const zipBlob =
        file.getBlob();

      const blobs =
        Utilities.unzip(
          zipBlob
        );


      // ---------------------------------------------------
      // BILDER AUS DER ZIP FILTERN
      // ---------------------------------------------------

      const images =
        blobs.filter(
          function(blob) {

            const contentType =
              blob.getContentType() || '';

            const name =
              blob.getName() || '';

            return (
              contentType.startsWith(
                'image/'
              ) ||
              /\.(jpg|jpeg|png|webp|gif)$/i.test(
                name
              )
            );

          }
        );


      // ---------------------------------------------------
      // ZIP OHNE BILDER IGNORIEREN
      // ---------------------------------------------------

      if (images.length === 0) {

        console.log(
          'ZIP enthält keine Bilder: ' +
          fileName
        );

        continue;
      }


      // ---------------------------------------------------
      // BILDER SORTIEREN
      //
      // 1.jpg
      // 2.jpg
      // 3.jpg
      // ...
      // ---------------------------------------------------

      images.sort(
        function(a, b) {

          return a
            .getName()
            .localeCompare(
              b.getName(),
              undefined,
              {
                numeric: true,
                sensitivity: 'base'
              }
            );

        }
      );


      // ---------------------------------------------------
      // ERSTES BILD ALS VORSCHAU
      // ---------------------------------------------------

      const firstImage =
        images[0];

      let contentType =
        firstImage.getContentType();

      if (
        !contentType ||
        !contentType.startsWith('image/')
      ) {

        contentType =
          getImageMimeTypeFromName(
            firstImage.getName()
          );

      }


      const preview =
        'data:' +
        contentType +
        ';base64,' +
        Utilities.base64Encode(
          firstImage.getBytes()
        );


      // ---------------------------------------------------
      // CAROUSEL IN DATENBANK SPEICHERN
      // ---------------------------------------------------

      result.content.push({

        id:
          file.getId(),

        name:
          fileName,

        title:
          createTitle(
            fileName
          ),

        platforms: [
          'instagram',
          'facebook',
          'linkedin'
        ],

        format:
          'Carousel',

        mimeType:
          'application/zip',

        slideCount:
          images.length,

        preview:
          preview,

        download:
          getDownloadUrl(file),

        file:
          getDownloadUrl(file),

        zip:
          true,

        zipFile:
          true,

        modified:
          file
            .getLastUpdated()
            .toISOString()

      });

    }

    catch (error) {

      throw new Error(
        'Carousel ZIP konnte nicht verarbeitet werden: ' +
        fileName +
        ' | ' +
        error
      );

    }
  }
}


/* =========================================================
   ZIP-DATEI ERKENNEN
   ========================================================= */

function isZipFile(file) {

  const mimeType =
    String(
      file.getMimeType() || ''
    ).toLowerCase();

  const name =
    String(
      file.getName() || ''
    ).toLowerCase();


  return (
    mimeType === 'application/zip' ||
    mimeType === 'application/x-zip-compressed' ||
    name.endsWith('.zip')
  );
}


/* =========================================================
   MIME-TYPE FÜR BILDER INNERHALB EINER ZIP
   ========================================================= */

function getImageMimeTypeFromName(
  fileName
) {

  const name =
    String(
      fileName || ''
    ).toLowerCase();


  if (
    name.endsWith('.jpg') ||
    name.endsWith('.jpeg')
  ) {

    return 'image/jpeg';

  }


  if (name.endsWith('.png')) {

    return 'image/png';

  }


  if (name.endsWith('.webp')) {

    return 'image/webp';

  }


  if (name.endsWith('.gif')) {

    return 'image/gif';

  }


  return 'image/jpeg';
}


/* =========================================================
   VIDEO / DATEI AUSLIEFERN
   ========================================================= */

/* =========================================================
   URLS
   ========================================================= */

function getThumbnailUrl(file) {

  return (
    'https://drive.google.com/thumbnail?id=' +
    file.getId() +
    '&sz=w600'
  );
}


function getDownloadUrl(file) {

  return (
    'https://drive.google.com/uc?export=download&id=' +
    file.getId()
  );
}


function getVideoUrl(file) {

  return (
    'https://drive.google.com/uc?export=download&id=' +
    file.getId()
  );
}


/* =========================================================
   DATEITYP
   ========================================================= */

function isMediaFile(file) {

  const mimeType =
    file.getMimeType();


  return (
    mimeType.startsWith(
      'image/'
    ) ||
    mimeType.startsWith(
      'video/'
    )
  );
}


/* =========================================================
   TITEL
   ========================================================= */

function createTitle(fileName) {

  return String(
    fileName || ''
  )

    // Dateiendung entfernen
    .replace(
      /\.[^/.]+$/,
      ''
    )

    // Unterstriche / Bindestriche
    .replace(
      /[_-]+/g,
      ' '
    )

    // Mehrfache Leerzeichen entfernen
    .replace(
      /\s+/g,
      ' '
    )

    .trim();
}


/* =========================================================
   NEUESTES ÄNDERUNGSDATUM
   ========================================================= */

function getNewestModification(
  slides
) {

  let newest = '';


  slides.forEach(
    function(slide) {

      if (
        slide.modified >
        newest
      ) {

        newest =
          slide.modified;

      }

    }
  );


  return newest;
}