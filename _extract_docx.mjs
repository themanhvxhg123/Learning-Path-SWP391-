import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const base = "C:\\Users\\hung2\\Documents\\GitHub\\Learning-Path-SWP391-";
const docx = fs.readdirSync(base).find((f) => f.endsWith(".docx"));
const docxPath = path.join(base, docx);
const tmp = path.join(base, "_docx_tmp");
fs.rmSync(tmp, { recursive: true, force: true });
fs.mkdirSync(tmp);
const ps = `Expand-Archive -LiteralPath '${docxPath.replace(/'/g, "''")}' -DestinationPath '${tmp.replace(/'/g, "''")}' -Force`;
execSync(`powershell -NoProfile -Command "${ps}"`, { stdio: "inherit" });
const xml = fs.readFileSync(path.join(tmp, "word", "document.xml"), "utf8");
const paras = [];
const pRe = /<w:p[\s>][\s\S]*?<\/w:p>/g;
let pm;
while ((pm = pRe.exec(xml)) !== null) {
  const p = pm[0];
  let line = "";
  const tRe = /<w:t[^>]*>([\s\S]*?)<\/w:t>/g;
  let tm;
  while ((tm = tRe.exec(p)) !== null) line += tm[1];
  paras.push(line);
}
const text = paras.join("\n");
const out = path.join(base, "_extracted_docx.txt");
fs.writeFileSync(out, text, "utf8");
console.log(text);
