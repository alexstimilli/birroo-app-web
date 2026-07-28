with open("src/components/FeedbackDialog.tsx", "r") as f:
    content = f.read()

new_content = content.replace('''            <a
              href="mailto:info@birroo.it"
              className="flex items-center justify-center w-full h-12 text-sm font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-colors mt-2"
            >
              Apri nell'app di posta
            </a>''', '')

with open("src/components/FeedbackDialog.tsx", "w") as f:
    f.write(new_content)
