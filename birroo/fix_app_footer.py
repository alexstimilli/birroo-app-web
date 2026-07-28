import re

with open("src/App.tsx", "r") as f:
    content = f.read()

# Add import if not present
if "import { FeedbackDialog }" not in content:
    content = content.replace('import { MapPin, Search', 'import { FeedbackDialog } from "./components/FeedbackDialog";\nimport { MapPin, Search')

# Find the footer links section
footer_start = content.find('{/* Footer Links */}')
footer_end = content.find('function BirrooLogo', footer_start)

# Extract everything before and after the footer
before_footer = content[:footer_start]
after_footer = content[content.rfind(');', 0, footer_end) + 2:]

new_footer = """{/* Footer Links */}
      <div className="flex flex-col gap-2 px-2 mt-4 text-center pb-32 mb-8">
        <FeedbackDialog />
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
      </div>
    </div>
  );
}
"""

with open("src/App.tsx", "w") as f:
    f.write(before_footer + new_footer + "\n\nfunction" + after_footer.split("function", 1)[1])

