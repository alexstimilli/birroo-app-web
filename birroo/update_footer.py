with open("src/App.tsx", "r") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if '{/* Footer Links */}' in line:
        start = i
        break

for i in range(start, len(lines)):
    if 'function BirrooLogo' in lines[i]:
        end = i
        break

# The block to replace is lines[start:end-2] approximately. Let's find exactly the `    </div>` before `  );` before `}` before `function BirrooLogo`
for i in range(end, start, -1):
    if lines[i].strip() == ');':
        actual_end = i - 2
        break

new_footer_content = """      {/* Footer Links */}
      <div className="flex flex-col gap-2 px-2 mt-4 text-center pb-4">
        <Dialog>
          <DialogTrigger className="text-xs font-medium text-slate-400 hover:text-slate-600 transition-colors">
            {t("terms_title", "Termini e Condizioni")}
          </DialogTrigger>
          <DialogContent className="sm:max-w-md rounded-3xl p-6 z-[4000] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">{t("terms_title", "Termini e Condizioni")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 text-sm text-slate-600 mt-2">
              <p>
                <strong>{t("safety_title", "Guida con prudenza")}</strong>
              </p>
              <p>
                {t("safety_desc_1")}
              </p>
              <p>
                {t("safety_desc_2")}
              </p>
            </div>
          </DialogContent>
        </Dialog>
        <Dialog>
          <DialogTrigger className="text-xs font-medium text-slate-400 hover:text-slate-600 transition-colors">
            {t("privacy_policy_title", "Privacy Policy")}
          </DialogTrigger>
          <DialogContent className="sm:max-w-md rounded-3xl p-6 z-[4000] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">{t("privacy_policy_title", "Privacy Policy")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 text-sm text-slate-600 mt-2">
              <p>
                <strong>{t("privacy_title", "La tua privacy su Birroo")}</strong>
              </p>
              <p>
                {t("cookie_desc_1")}
              </p>
              <p>
                {t("cookie_desc_2")}
              </p>
            </div>
          </DialogContent>
        </Dialog>
        <Dialog>
          <DialogTrigger className="text-xs font-medium text-slate-400 hover:text-slate-600 transition-colors">
            Dati
          </DialogTrigger>
          <DialogContent className="sm:max-w-md rounded-3xl p-6 z-[4000] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">Dati</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 text-sm text-slate-600 mt-2 leading-relaxed">
              <p>
                I dati relativi ai prezzi del carburante e all'anagrafica degli impianti sono elaborati a partire dagli Open Data forniti dal Ministero delle Imprese e del Made in Italy (MIMIT) tramite l'Osservatorio Prezzi Carburanti, che a loro volta sono comunicati dagli esercenti secondo norma di legge. Birroo non può garantirne l'aggiornamento in tempo reale.
              </p>
            </div>
          </DialogContent>
        </Dialog>
        <Dialog>
          <DialogTrigger className="text-xs font-medium text-slate-400 hover:text-slate-600 transition-colors">
            Invia feedback sul prodotto
          </DialogTrigger>
          <DialogContent className="sm:max-w-md rounded-3xl p-6 z-[4000]">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-center mb-4">Invia feedback a Birroo</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-3 mt-2">
              <a
                href="https://docs.google.com/forms/d/e/1FAIpQLSePMRvEclbk73sLZ6g0ADub_-yQTuZcvKeHEbWfkhd80ujY3Q/viewform"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-full h-12 text-sm font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
              >
                Invia feedback a Birroo
              </a>
              <a
                href="mailto:info@birroo.it"
                className="flex items-center justify-center w-full h-12 text-sm font-bold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              >
                Contattaci
              </a>
            </div>
          </DialogContent>
        </Dialog>
      </div>\n"""

lines = lines[:start] + [new_footer_content] + lines[actual_end:]

with open("src/App.tsx", "w") as f:
    f.writelines(lines)
