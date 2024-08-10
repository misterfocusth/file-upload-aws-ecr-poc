const express = require('express');
const multer = require('multer');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Set up the Express app
const app = express();
const port = 3000;

// Set up static file serving
app.use(express.static('public'));

// Configure Multer for file uploads
const upload = multer({ dest: 'uploads/' });

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
})

// Handle the file upload and push to ECR
app.post('/upload', upload.single('image'), (req, res) => {
    const imageFilePath = path.join(__dirname, req.file.path);
    const imageName = req.file.originalname.replace('.tar', '');
    const ecrRepoUri = '398224632975.dkr.ecr.us-east-1.amazonaws.com/test-12345'; // Replace with your ECR URI

    // Load the Docker image from the uploaded file
    exec(`docker load -i ${imageFilePath}`, (err, stdout, stderr) => {
        if (err) {
            console.error(`Error loading Docker image: ${stderr}`);
            return res.status(500).send('Error loading Docker image');
        }

        // Tag the Docker image for ECR
        exec(`docker tag ${imageName} ${ecrRepoUri}:${imageName}`, (err, stdout, stderr) => {
            if (err) {
                console.error(`Error tagging Docker image: ${stderr}`);
                return res.status(500).send('Error tagging Docker image');
            }

            // Push the Docker image to ECR
            exec(`docker push ${ecrRepoUri}:${imageName}`, (err, stdout, stderr) => {
                if (err) {
                    console.error(`Error pushing Docker image: ${stderr}`);
                    return res.status(500).send('Error pushing Docker image');
                }

                // Delete the uploaded file from local storage
                fs.unlinkSync(imageFilePath);

                res.send(`Docker image pushed successfully to ECR: ${ecrRepoUri}:${imageName}`);
            });
        });
    });
});

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
