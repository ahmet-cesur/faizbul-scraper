from PIL import Image, ImageDraw, ImageOps
import os

source_path = r'C:\Users\BC\AndroidStudioProjects\FaizBul\app\src\main\res\drawable\app_logo.png'
base_res_path = r'C:\Users\BC\AndroidStudioProjects\FaizBul\app\src\main\res'

densities = {
    'mipmap-mdpi': 48,
    'mipmap-hdpi': 72,
    'mipmap-xhdpi': 96,
    'mipmap-xxhdpi': 144,
    'mipmap-xxxhdpi': 192
}

def create_circular_mask(size):
    mask = Image.new('L', (size, size), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((0, 0, size, size), fill=255)
    return mask

def process_logo():
    if not os.path.exists(source_path):
        print(f"Source file not found: {source_path}")
        return

    img = Image.open(source_path)
    
    for folder, size in densities.items():
        folder_path = os.path.join(base_res_path, folder)
        if not os.path.exists(folder_path):
            os.makedirs(folder_path)
            
        # Regular icon
        resized_img = img.resize((size, size), Image.Resampling.LANCZOS)
        resized_img.save(os.path.join(folder_path, 'ic_launcher.png'), 'PNG')
        
        # Round icon (applying a circular mask)
        mask = create_circular_mask(size)
        round_img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        round_img.paste(resized_img, (0, 0), mask)
        round_img.save(os.path.join(folder_path, 'ic_launcher_round.png'), 'PNG')
        
        print(f"Processed {folder} at {size}x{size}")

    # Also optimize the main drawable logo (scaling it down to a reasonable size like 512x512)
    img_large = img.resize((512, 512), Image.Resampling.LANCZOS)
    img_large.save(source_path, 'PNG')
    print("Optimized main app_logo.png to 512x512")

if __name__ == "__main__":
    process_logo()
