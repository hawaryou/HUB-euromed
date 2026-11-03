/** EuroMed — Apps Script indépendant pour "Faire une demande". Déploiement : Application Web, exécuter en tant que vous, accès Toute personne. */
const DEMANDE_DESTINATAIRE='valentineuromed@gmail.com';
function doGet(){return ContentService.createTextOutput('EuroMed — service Faire une demande actif');}
function doPost(e){
 try{
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
  return ContentService.createTextOutput(JSON.stringify({ok:true})).setMimeType(ContentService.MimeType.JSON);
 }catch(err){console.error(err&&err.stack?err.stack:err);return ContentService.createTextOutput(JSON.stringify({ok:false,error:String(err&&err.message||err)})).setMimeType(ContentService.MimeType.JSON)}
}