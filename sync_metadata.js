const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });
const cloudinary = require('cloudinary').v2;

cloudinary.config(true); // Forces cloudinary to read CLOUDINARY_URL from process.env

const uploadToCloudinary = async (filePath, folder) => {
  try {
    const filename = path.basename(filePath);
    // Determine target public ID (without extension, or with extension? raw files keep their extension in Cloudinary but as part of public_id if not careful.
    // Actually when resource_type: "raw", public_id should include the extension, Cloudinary handles it.
    
    // We upload with resource_type: raw
    const result = await cloudinary.uploader.upload(filePath, {
      resource_type: "raw",
      folder: folder,
      use_filename: true,
      unique_filename: false,
      overwrite: true
    });
    console.log(`✅ Uploaded ${filePath} -> ${result.public_id}`);
  } catch (err) {
    console.error(`❌ Failed to upload ${filePath}:`, err);
  }
};

const main = async () => {
    const baseDir = path.resolve("..", "..", "banmao", "có nền");
    console.log("Scanning base dir:", baseDir);

    if (!fs.existsSync(baseDir)) {
        console.error("Directory not found:", baseDir);
        return;
    }

    const folders = fs.readdirSync(baseDir, { withFileTypes: true })
        .filter(d => d.isDirectory());

    console.log(`Found ${folders.length} folders...`);

    let uploadedCount = 0;

    for (const folder of folders) {
        const folderName = folder.name;
        // Mapping Banmao_GroupX -> banmao/GroupX
        
        let cldFolderName = folderName;
        // The image fetching uses: banmao/... 
        // e.g. banmao/Banmao_Group10_DeFi or banmao/Group10_DeFi?
        // Let's assume it maps directly as it was in `fetch_all.js`
        // Actually, if we upload them to banmao/folderName, our API search `folder:banmao/*` will find them.
        
        // Let's map "Banmao_Group14_Expressions" to "banmao/Group14_Expressions" or whatever it is exactly in Cloudinary
        // Let's just upload them exactly to `banmao/` + folderName 
        // Wait, "Banmao_" was usually stripped? Wait, if we use `banmao/${folderName}` it's safer.
        // Actually wait, let's look at `route.ts`. The folder param from frontend is exact, like "banmao/Group14_Expressions". 
        // So `folderName` locally is `Banmao_Group14_Expressions`. We should map `Banmao_` to `banmao/`?
        // No, if the Cloudinary folder is `banmao/Group14_Expressions`, then `Banmao_Group14_Expressions` -> `banmao/Group14...`
        
        let targetCldFolder = `banmao/${folderName}`;

        const localFolderPath = path.join(baseDir, folderName);
        
        const promptFile = path.join(localFolderPath, "prompt.txt");
        const shareFile = path.join(localFolderPath, "share_links.txt");

        if (fs.existsSync(promptFile)) {
            await uploadToCloudinary(promptFile, targetCldFolder);
            uploadedCount++;
        }
        
        if (fs.existsSync(shareFile)) {
            await uploadToCloudinary(shareFile, targetCldFolder);
            uploadedCount++;
        }
    }
    
    console.log(`\n🎉 Finished! Uploaded ${uploadedCount} metadata files to Cloudinary.`);
};

main();
