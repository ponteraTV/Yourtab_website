import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
const prisma=new PrismaClient();
async function main(){
 const email=(process.env.ADMIN_EMAIL||"admin@example.com").toLowerCase();
 const password=process.env.ADMIN_PASSWORD||"CHANGE_ME";
 if(password==="CHANGE_ME") console.warn("Set ADMIN_PASSWORD before production seeding.");
 await prisma.user.upsert({where:{email},update:{role:"ADMIN",status:"ACTIVE",passwordHash:await hash(password,12)},create:{email,name:"YourTab Admin",role:"ADMIN",passwordHash:await hash(password,12)}});
 for(const name of ["Entertainment","Music","Technology","News","Sports","Education"]){const slug=name.toLowerCase();await prisma.category.upsert({where:{slug},update:{},create:{name,slug}})}
 console.info("YourTab seed complete.");
}
main().catch(e=>{console.error(e);process.exit(1)}).finally(()=>prisma.$disconnect());
