const input=document.getElementById("search");
const items=[...document.querySelectorAll("[data-search]")];
const empty=document.getElementById("empty");
function filter(){
 const q=input.value.trim().toLowerCase();
 let shown=0;
 items.forEach(el=>{
   const ok=!q||el.dataset.search.toLowerCase().includes(q)||el.innerText.toLowerCase().includes(q);
   el.hidden=!ok;if(ok)shown++;
 });
 empty.hidden=shown!==0;
}
input.addEventListener("input",filter);
document.querySelectorAll(".nav").forEach(n=>{
 n.addEventListener("click",()=>{
  document.querySelectorAll(".nav").forEach(x=>x.classList.remove("active"));
  n.classList.add("active");
 });
});
