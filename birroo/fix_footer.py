with open("src/App.tsx", "r") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if '{/* Footer Links */}' in line:
        start = i
        break

lines_to_replace = []
lines_to_replace.append('      {/* Footer Links */}\n')
lines_to_replace.append('      <div className="flex flex-col gap-2 px-2 mt-4 text-center pb-4">\n')
lines_to_replace.append('        <div className="text-[10px] text-slate-400 mb-2 px-4 leading-tight">\n')
lines_to_replace.append('          I dati relativi ai prezzi e all\'anagrafica degli impianti sono elaborati a partire dagli Open Data forniti dal Ministero delle Imprese e del Made in Italy (MIMIT) tramite l\'Osservatorio Prezzi Carburanti.\n')
lines_to_replace.append('        </div>\n')

# replace lines start to start+1
lines = lines[:start] + lines_to_replace + lines[start+2:]
with open("src/App.tsx", "w") as f:
    f.writelines(lines)
