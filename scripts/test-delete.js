const dbModule = require('../server/models/database');
const path = require('path');
const fs = require('fs');

async function test() {
  await dbModule.init();
  const db = dbModule.getDb();
  
  // Insert a test media item
  const testPath = '/uploads/test-image.jpg';
  const fullTestPath = path.join(__dirname, '../public', testPath);
  
  // Create dummy file
  fs.writeFileSync(fullTestPath, 'dummy content', 'utf8');
  console.log("Created dummy file at:", fullTestPath);
  
  db.run(
    'INSERT INTO media (filename, path, mime_type, size, uploaded_by) VALUES (?, ?, ?, ?, ?)',
    ['test-image.jpg', testPath, 'image/jpeg', 13, 1],
    function(err) {
      if (err) {
        console.error("Insert error:", err);
        process.exit(1);
      }
      const testId = this.lastID;
      console.log("Inserted test media with ID:", testId);
      
      // Query to verify
      db.get('SELECT * FROM media WHERE id = ?', [testId], (err, row) => {
        if (err || !row) {
          console.error("Query error:", err);
          process.exit(1);
        }
        console.log("Verified database row:", row);
        
        // Execute deletion logic
        const filePath = path.join(__dirname, '../public', row.path);
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log("Successfully unlinked file at:", filePath);
          } else {
            console.log("File not found for unlinking.");
          }
        } catch(fsErr) {
          console.error("FS deletion error:", fsErr);
        }
        
        db.run('DELETE FROM media WHERE id = ?', [testId], function(delErr) {
          if (delErr) {
            console.error("DB deletion error:", delErr);
            process.exit(1);
          }
          console.log("Successfully deleted database row. Changes:", this.changes);
          process.exit(0);
        });
      });
    }
  );
}

test().catch(e => {
  console.error("Test failed:", e);
  process.exit(1);
});
