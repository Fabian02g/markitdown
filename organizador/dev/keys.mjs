import crypto from 'node:crypto';
const secret='super-secret-jwt-token-with-at-least-32-characters-long';
const b=o=>Buffer.from(JSON.stringify(o)).toString('base64url');
const sign=p=>{const h=b({alg:'HS256',typ:'JWT'}),d=b(p);return `${h}.${d}.${crypto.createHmac('sha256',secret).update(`${h}.${d}`).digest('base64url')}`};
const exp=Math.floor(Date.now()/1000)+3600*24*365*5;
console.log(`JWT_SECRET=${secret}\nANON_KEY=${sign({role:'anon',iss:'supabase',exp})}\nSERVICE_KEY=${sign({role:'service_role',iss:'supabase',exp})}`);
