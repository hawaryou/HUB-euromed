/** EuroMed — Apps Script indépendant pour "Faire une demande". Déploiement : Application Web, exécuter en tant que vous, accès Toute personne. */
const DEMANDE_DESTINATAIRE='valentineuromed@gmail.com';
function doGet(){return ContentService.createTextOutput('EuroMed — service Faire une demande actif');}
function doPost(e){
 try{
    euromedAuthorizeMail_(e);
  if(!e||!e.postData||!e.postData.contents)throw new Error('Aucune donnée reçue.');
  const d=JSON.parse(e.postData.contents);
  ['typeDemande','materiel','description','patientEtablissement','demandeur'].forEach(k=>{if(!String(d[k]||'').trim())throw new Error('Champ obligatoire manquant : '+k)});
  const photos=Array.isArray(d.photos)?d.photos:[];
  const videos=Array.isArray(d.videos)?d.videos:[];
  if(photos.length>5)throw new Error('5 photos maximum.');
  if(videos.length>1)throw new Error('Une seule vidéo maximum.');
  const attachments=photos.map((p,i)=>{if(!p||!p.base64)throw new Error('Photo invalide '+(i+1));const mime=String(p.type||'image/jpeg');if(!/^image\\//i.test(mime))throw new Error('Format de photo non autorisé');return Utilities.newBlob(Utilities.base64Decode(p.base64),mime,String(p.nom||('photo-'+(i+1))))});
  videos.forEach((v,i)=>{if(!v||!v.base64)throw new Error('Vidéo invalide '+(i+1));const mime=String(v.type||'video/mp4');if(!/^video\\//i.test(mime))throw new Error('Format vidéo non autorisé');attachments.push(Utilities.newBlob(Utilities.base64Decode(v.base64),mime,String(v.nom||('video-'+(i+1)))))});
  const total=attachments.reduce((n,b)=>n+b.getBytes().length,0);if(total>18*1024*1024)throw new Error('Pièces jointes supérieures à 18 Mo.');
  const subject='[EuroMed] '+d.typeDemande+' — '+d.materiel+' — '+d.patientEtablissement;
  const body=['Nouvelle demande depuis HUB EuroMed','','Type : '+d.typeDemande,'Urgence : '+(d.urgence||'Normale'),'Matériel : '+d.materiel,'Marque : '+(d.marque||'Non précisée'),'Modèle : '+(d.modele||'Non précisé'),'Quantité : '+(d.quantite||'1'),'Budget : '+(d.budget||'Non précisé'),'','Description :',d.description,'','Patient / établissement : '+d.patientEtablissement,'Foyer : '+(d.foyer?'Oui':'Non'),'Lieu / service : '+(d.foyer?(d.lieu||'Non précisé'):'Non concerné'),'Demandeur : '+d.demandeur,'Téléphone : '+(d.telephone||'Non renseigné'),'E-mail de contact : '+(d.emailContact||'Non renseigné'),'Date : '+(d.dateDemande||new Date().toLocaleString('fr-FR')),'Photos jointes : '+photos.length,'Vidéos jointes : '+videos.length].join('\n');
  MailApp.sendEmail({to:DEMANDE_DESTINATAIRE,subject:subject,body:body,name:'EuroMed - Demandes de matériel',attachments:attachments});
  euromedLogMailEvent_(e, EUROMED_APP_KEY, 'accepted');
    return ContentService.createTextOutput(JSON.stringify({ok:true})).setMimeType(ContentService.MimeType.JSON);
 }catch(err){
    euromedLogMailEvent_(e, EUROMED_APP_KEY, 'failed', err && err.name ? err.name : 'error');console.error(err&&err.stack?err.stack:err);return ContentService.createTextOutput(JSON.stringify({ok:false,error:String(err&&err.message||err)})).setMimeType(ContentService.MimeType.JSON)}
}

/**
 * EuroMed — vérification serveur avant tout envoi d'e-mail.
 * À copier dans CHAQUE projet Google Apps Script qui appelle MailApp/GmailApp.
 * Ne jamais journaliser ni enregistrer le jeton reçu.
 */
const EUROMED_AUTH_URL = 'https://nrtrraawiqfbajccfmzc.supabase.co';
const EUROMED_AUTH_PUBLIC_KEY = 'sb_publishable_mI8nBWjKRxTgn2b8ppAyoA_BaxQI4zx';
// À personnaliser différemment dans chaque projet Apps Script.
const EUROMED_APP_KEY = 'faire-demande';

function euromedAuthorizeMail_(event) {
  const params = {};
  if (event && event.parameter) {
    Object.keys(event.parameter).forEach(function (key) {
      params[key] = event.parameter[key];
    });
  }

  const raw = event && event.postData && event.postData.contents
    ? String(event.postData.contents) : '';
  if (raw) {
    try {
      const object = JSON.parse(raw);
      if (object && typeof object === 'object' && !Array.isArray(object)) {
        Object.keys(object).forEach(function (key) { params[key] = object[key]; });
      }
    } catch (ignore) {
      raw.split('&').forEach(function (part) {
        const index = part.indexOf('=');
        if (index < 0) return;
        const key = decodeURIComponent(part.slice(0, index).replace(/\+/g, ' '));
        const value = decodeURIComponent(part.slice(index + 1).replace(/\+/g, ' '));
        if (!(key in params)) params[key] = value;
      });
    }
  }

  const accessToken = String(params.euromed_access_token || '').trim();
  if (!accessToken) throw new Error('Connexion EuroMed requise pour envoyer un e-mail.');

  const headers = {
    apikey: EUROMED_AUTH_PUBLIC_KEY,
    Authorization: 'Bearer ' + accessToken
  };
  const userResponse = UrlFetchApp.fetch(EUROMED_AUTH_URL + '/auth/v1/user', {
    method: 'get', headers: headers, muteHttpExceptions: true
  });
  if (userResponse.getResponseCode() !== 200) {
    throw new Error('Session EuroMed invalide ou expirée. Reconnectez-vous.');
  }
  const user = JSON.parse(userResponse.getContentText() || '{}');
  if (!user.id || !user.email) throw new Error('Compte EuroMed introuvable.');

  const profileUrl = EUROMED_AUTH_URL + '/rest/v1/euromed_profiles' +
    '?select=approved,role,active,session_revoked_at&id=eq.' + encodeURIComponent(user.id);
  const profileResponse = UrlFetchApp.fetch(profileUrl, {
    method: 'get', headers: headers, muteHttpExceptions: true
  });
  if (profileResponse.getResponseCode() !== 200) {
    throw new Error('Impossible de vérifier l’autorisation EuroMed.');
  }
  const profiles = JSON.parse(profileResponse.getContentText() || '[]');
  if (!profiles.length || profiles[0].approved !== true || profiles[0].active !== true) {
    euromedLogMailEvent_(event, EUROMED_APP_KEY, 'blocked', profiles.length && profiles[0].active === false ? 'account-suspended' : 'account-not-approved');
    throw new Error('Compte EuroMed en attente de validation : envoi refusé.');
  }
  const issuedAt = euromedTokenIssuedAt_(accessToken);
  const revokedAt = profiles[0].session_revoked_at ? Math.floor(new Date(profiles[0].session_revoked_at).getTime() / 1000) : 0;
  if (!issuedAt || (revokedAt && issuedAt <= revokedAt)) {
    euromedLogMailEvent_(event, EUROMED_APP_KEY, 'blocked', 'session-revoked');
    throw new Error('Session révoquée. Reconnectez-vous avec votre nouveau lien d’accès.');
  }

  const policyResponse = UrlFetchApp.fetch(EUROMED_AUTH_URL + '/rest/v1/rpc/euromed_get_mail_policy', {
    method: 'post', headers: headers, contentType: 'application/json', payload: '{}', muteHttpExceptions: true
  });
  if (policyResponse.getResponseCode() !== 200 || policyResponse.getContentText() !== 'true') {
    euromedLogMailEvent_(event, EUROMED_APP_KEY, 'blocked', 'mail-paused');
    throw new Error('Les envois e-mail sont temporairement suspendus par l’administrateur EuroMed.');
  }
  return { id: user.id, email: user.email, role: profiles[0].role };
}

function euromedTokenIssuedAt_(token) {
  try {
    const part = String(token).split('.')[1];
    if (!part) return 0;
    const decoded = Utilities.newBlob(Utilities.base64DecodeWebSafe(part)).getDataAsString();
    return Number(JSON.parse(decoded).iat || 0);
  } catch (ignore) { return 0; }
}

/**
 * Ajoute un événement minimal au suivi administrateur (sans destinataire ni contenu).
 * Appeler après l'envoi MailApp réussi, puis dans catch en cas d'échec.
 */
function euromedLogMailEvent_(event, appKey, status, errorCode) {
  try {
    const params = {};
    if (event && event.parameter) Object.keys(event.parameter).forEach(function (key) { params[key] = event.parameter[key]; });
    const raw = event && event.postData && event.postData.contents ? String(event.postData.contents) : '';
    if (raw) {
      try { Object.assign(params, JSON.parse(raw)); } catch (ignore) {
        raw.split('&').forEach(function (part) {
          const i = part.indexOf('='); if (i < 0) return;
          params[decodeURIComponent(part.slice(0, i).replace(/\+/g, ' '))] = decodeURIComponent(part.slice(i + 1).replace(/\+/g, ' '));
        });
      }
    }
    const token = String(params.euromed_access_token || '').trim();
    if (!token) return;
    UrlFetchApp.fetch(EUROMED_AUTH_URL + '/rest/v1/rpc/euromed_log_mail_event', {
      method: 'post',
      headers: { apikey: EUROMED_AUTH_PUBLIC_KEY, Authorization: 'Bearer ' + token },
      contentType: 'application/json',
      payload: JSON.stringify({ p_app_key: String(appKey || 'inconnu').slice(0, 80), p_status: status, p_error_code: status === 'failed' ? String(errorCode || 'erreur').slice(0, 80) : null }),
      muteHttpExceptions: true
    });
  } catch (ignore) { /* Les journaux ne doivent jamais empêcher un envoi ou son traitement. */ }
}

