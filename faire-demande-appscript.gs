/** EuroMed — Apps Script indépendant pour "Faire une demande". Déploiement : Application Web, exécuter en tant que vous, accès Toute personne. */
const DEMANDE_DESTINATAIRE='valentineuromed@gmail.com';
function doGet(){return ContentService.createTextOutput('EuroMed — service Faire une demande actif');}
function doPost(e){
 try{
  if(!e||!e.postData||!e.postData.contents)throw new Error('Aucune donnée reçue.');
  const d=JSON.parse(e.postData.contents);
  ['typeDemande','materiel','description','patientEtablissement','demandeur'].forEach(k=>{if(!String(d[k]||'').trim())throw new Error('Champ obligatoire manquant : '+k)});
  const photos=Array.isArray(d.photos)?d.photos:[];
  const attachments=photos.map((p,i)=>{if(!p||!p.base64)throw new Error('Photo invalide '+(i+1));const mime=String(p.type||'image/jpeg');if(!/^image\//i.test(mime))throw new Error('Format de photo non autorisé');return Utilities.newBlob(Utilities.base64Decode(p.base64),mime,String(p.nom||('photo-'+(i+1))))});
  const total=attachments.reduce((n,b)=>n+b.getBytes().length,0);if(total>10*1024*1024)throw new Error('Pièces jointes supérieures à 10 Mo.');
  const subject='[EuroMed] '+d.typeDemande+' — '+d.materiel+' — '+d.patientEtablissement;
  const body=['Nouvelle demande depuis HUB EuroMed','','Type : '+d.typeDemande,'Urgence : '+(d.urgence||'Normale'),'Matériel : '+d.materiel,'Marque : '+(d.marque||'Non précisée'),'Modèle : '+(d.modele||'Non précisé'),'Quantité : '+(d.quantite||'1'),'Budget : '+(d.budget||'Non précisé'),'','Description :',d.description,'','Patient / établissement : '+d.patientEtablissement,'Lieu / service : '+(d.lieu||'Non précisé'),'Demandeur : '+d.demandeur,'Téléphone : '+(d.telephone||'Non renseigné'),'E-mail de contact : '+(d.emailContact||'Non renseigné'),'Date : '+(d.dateDemande||new Date().toLocaleString('fr-FR')),'Photos jointes : '+attachments.length].join('\n');
  MailApp.sendEmail({to:DEMANDE_DESTINATAIRE,subject:subject,body:body,name:'EuroMed - Demandes de matériel',attachments:attachments});
  return ContentService.createTextOutput(JSON.stringify({ok:true})).setMimeType(ContentService.MimeType.JSON);
 }catch(err){console.error(err&&err.stack?err.stack:err);return ContentService.createTextOutput(JSON.stringify({ok:false,error:String(err&&err.message||err)})).setMimeType(ContentService.MimeType.JSON)}
}