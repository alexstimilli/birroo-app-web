with open("src/lib/firebase.ts", "r") as f:
    content = f.read()

new_content = content.replace('measurementId: "G-B84ML9TZL1"', 'measurementId: "G-Q0DYDLBKXK"')

with open("src/lib/firebase.ts", "w") as f:
    f.write(new_content)
