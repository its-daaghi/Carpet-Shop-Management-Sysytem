import base64
from io import BytesIO
from PIL import Image

image_path = r"C:\Users\Ahmad\.gemini\antigravity\brain\67693a04-8fb6-469c-87c4-517e52f79bab\media__1776927103992.jpg"
img = Image.open(image_path)
width, height = img.size

# Approximate crop box based on typical letterhead photo
left = int(width * 0.08)
upper = int(height * 0.17)
right = int(width * 0.98)
lower = int(height * 0.245)

cropped = img.crop((left, upper, right, lower))

# Save to BytesIO
buffered = BytesIO()
cropped.save(buffered, format="JPEG", quality=80)
img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")

# Write to a JS file that exports it
js_content = f'export const usmanHeaderBase64 = "data:image/jpeg;base64,{img_str}";\n'

with open(r"e:\HM Carpet\frontend\src\app\shop\[id]\usmanHeaderBase64.js", "w") as f:
    f.write(js_content)

print("Cropped and saved to usmanHeaderBase64.js")
