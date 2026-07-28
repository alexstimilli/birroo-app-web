with open("src/App.tsx", "r") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if '<strong>{t("privacy_title"' in line:
        # found the block
        start = i
        break

lines_to_replace = []
lines_to_replace.append('                <strong>{t("privacy_title", "La tua privacy su Birroo")}</strong>\n')
lines_to_replace.append('              </p>\n')
lines_to_replace.append('              <p>\n')
lines_to_replace.append('                {t("cookie_desc_1")}\n')
lines_to_replace.append('              </p>\n')
lines_to_replace.append('              <p>\n')
lines_to_replace.append('                {t("cookie_desc_2")}\n')
lines_to_replace.append('              </p>\n')
lines_to_replace.append('              <div className="pt-4 border-t border-slate-100 mt-4">\n')
lines_to_replace.append('                <p className="text-xs text-slate-500 italic">\n')
lines_to_replace.append('                  I dati relativi ai prezzi e all\'anagrafica degli impianti sono elaborati a partire dagli Open Data forniti dal Ministero delle Imprese e del Made in Italy (MIMIT) tramite l\'Osservatorio Prezzi Carburanti.\n')
lines_to_replace.append('                </p>\n')
lines_to_replace.append('              </div>\n')

# The original block starting at `<strong>{t("privacy_title", "La tua privacy su Birroo")}</strong>`
# went up to the closing `</p>` of cookie_desc_2.
# Let's find where the `</DialogContent>` is after this.
for j in range(start, len(lines)):
    if '</DialogContent>' in lines[j]:
        end = j
        break

# wait, we just want to replace the block between start and end-2 (which is the closing div)
# Actually, the original file had exactly this:
#               <p>
#                 <strong>{t("privacy_title", "La tua privacy su Birroo")}</strong>
#               </p>
#               <p>
#                 {t("cookie_desc_1")}
#               </p>
#               <p>
#                 {t("cookie_desc_2")}
#               </p>
#             </div>

lines = lines[:start] + lines_to_replace + lines[start+13:]
with open("src/App.tsx", "w") as f:
    f.writelines(lines)
