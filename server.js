import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { exec } from "child_process";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

dotenv.config({
  path: path.resolve("./.env"),
});

import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import multer from "multer";
import AdmZip from "adm-zip";
import yaml from "js-yaml";

const app = express();

app.use(cors());
app.use(express.json());

const upload = multer({
  dest: "uploads/",
});

/* =====================================================
   ENV VARIABLES
===================================================== */

const {
  AZURE_OPENAI_ENDPOINT: endpoint,
  AZURE_OPENAI_API_KEY: apiKey,
  AZURE_OPENAI_DEPLOYMENT: deployment,
  AZURE_API_VERSION: apiVersion,
} = process.env;

/* =====================================================
   CHAT AI API
===================================================== */

app.post(
  "/api/chat",
  async (req, res) => {

    try {

      const userMessage =
        req.body.message;

      const url =
        `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;

      const response =
        await fetch(url, {

          method: "POST",

          headers: {

            "Content-Type":
              "application/json",

            "api-key":
              apiKey,

          },

          body: JSON.stringify({

            messages: [

              {
                role: "system",
                content:
                  "You are a business assistant.",
              },

              {
                role: "user",
                content:
                  userMessage,
              },

            ],

            temperature: 0.7,
            max_tokens: 500,

          }),

        });

      const data =
        await response.json();

      const reply =
        data?.choices?.[0]
          ?.message?.content;

      return res.json({

        success: true,

        reply:
          reply ||
          "No response",

      });

    } catch (err) {

      console.error(
        "CHAT ERROR:",
        err
      );

      return res.status(500).json({

        success: false,

        error:
          err.message,

      });

    }

  }
);

/* =====================================================
   START PLATFORM
===================================================== */

app.get(
  "/api/start-platform",
  async (req, res) => {

    try {

      const batchFile =
        "C:\\mywave-2.8.3\\start-all.bat";

      console.log(
        "STARTING PLATFORM..."
      );

      exec(
        `cmd.exe /c "${batchFile}"`,
        (error, stdout, stderr) => {

          if (error) {

            console.error(
              "START PLATFORM ERROR:",
              error
            );

            return res.status(500).json({

              success: false,

              error:
                error.message,

            });
          }

          console.log(
            "PLATFORM STARTED SUCCESSFULLY"
          );

          return res.json({

            success: true,

            message:
              "MyWave Platform Started Successfully",

          });

        }
      );

    } catch (err) {

      console.error(
        "START API ERROR:",
        err
      );

      return res.status(500).json({

        success: false,

        error:
          err.message,

      });

    }

  }
);

/* =====================================================
   STOP PLATFORM
===================================================== */

app.get(
  "/api/stop-platform",
  async (req, res) => {

    try {

      const batchFile =
        "C:\\mywave-2.8.3\\stop-all.bat";

      console.log(
        "STOPPING PLATFORM..."
      );

      exec(
        `cmd.exe /c "${batchFile}"`,
        (error, stdout, stderr) => {

          if (error) {

            console.error(
              "STOP PLATFORM ERROR:",
              error
            );

            return res.status(500).json({

              success: false,

              error:
                error.message,

            });
          }

          console.log(
            "PLATFORM STOPPED SUCCESSFULLY"
          );

          return res.json({

            success: true,

            message:
              "MyWave Platform Stopped Successfully",

          });

        }
      );

    } catch (err) {

      console.error(
        "STOP API ERROR:",
        err
      );

      return res.status(500).json({

        success: false,

        error:
          err.message,

      });

    }

  }
);

/* =====================================================
   PARSE FILE
===================================================== */

const parseFile =
  async (file) => {

    let parsedConfig = null;

    if (
      file.originalname.endsWith(
        ".yml"
      ) ||
      file.originalname.endsWith(
        ".yaml"
      )
    ) {

      const yamlContent =
        fs.readFileSync(
          file.path,
          "utf-8"
        );

      parsedConfig =
        yaml.load(
          yamlContent
        );
    }

    else if (
      file.originalname.endsWith(
        ".json"
      )
    ) {

      const jsonContent =
        fs.readFileSync(
          file.path,
          "utf-8"
        );

      parsedConfig =
        JSON.parse(
          jsonContent
        );
    }

    else if (
      file.originalname.endsWith(
        ".zip"
      )
    ) {

      const zip =
        new AdmZip(
          file.path
        );

      const entries =
        zip.getEntries();

      const yamlEntry =
        entries.find(
          (e) =>
            e.entryName.endsWith(
              ".yml"
            ) ||
            e.entryName.endsWith(
              ".yaml"
            )
        );

      if (!yamlEntry) {

        throw new Error(
          "No YAML found inside ZIP"
        );
      }

      const yamlContent =
        yamlEntry
          .getData()
          .toString(
            "utf8"
          );

      parsedConfig =
        yaml.load(
          yamlContent
        );
    }

    else {

      throw new Error(
        "Unsupported file type"
      );
    }

    return parsedConfig;
  };

/* =====================================================
   LOAD INFOPLUGINS
===================================================== */

app.post(
  "/api/load-infoplugins",
  upload.single("file"),
  async (req, res) => {

    try {

      if (!req.file) {

        return res.status(400).json({

          success: false,

          error:
            "Please upload file",

        });
      }

      const parsedConfig =
        await parseFile(
          req.file
        );

      const infoPlugins =
        parsedConfig?.infoPluginSteps?.map(
          (plugin) => ({

            name:
              plugin.name,

            inputParameters:
              plugin.inputParameters ||
              [],

          })
        ) || [];

      return res.json({

        success: true,

        infoPlugins,

      });

    } catch (err) {

      console.error(
        "LOAD INFOPLUGINS ERROR:",
        err
      );

      return res.status(500).json({

        success: false,

        error:
          err.message,

      });

    }

  }
);

/* =====================================================
   EXECUTE INFOPLUGIN
===================================================== */

app.post(
  "/api/test-infoplugin",
  upload.single("file"),
  async (req, res) => {

    try {

      if (!req.file) {

        return res.status(400).json({

          success: false,

          error:
            "Please upload InfoPlugin file",

        });
      }

      const parsedConfig =
        await parseFile(
          req.file
        );

      const {
        infoPluginName,
      } = req.body;

      if (!infoPluginName) {

        return res.status(400).json({

          success: false,

          error:
            "Please select InfoPlugin",

        });
      }

      const infoPlugin =
        parsedConfig?.infoPluginSteps?.find(
          (plugin) =>
            plugin.name ===
            infoPluginName
        );

      if (!infoPlugin) {

        return res.status(400).json({

          success: false,

          error:
            "Selected InfoPlugin not found",

        });
      }

      return res.json({

        success: true,

        message:
          "InfoPlugin Executed Successfully",

      });

    } catch (err) {

      console.error(
        "INFOPLUGIN ERROR:",
        err
      );

      return res.status(500).json({

        success: false,

        error:
          err.message,

      });

    }

  }
);

/* =====================================================
   HEALTH CHECK
===================================================== */

app.get(
  "/api/health",
  (req, res) => {

    return res.json({

      success: true,

      message:
        "Server Running Successfully",

    });

  }
);

/* =====================================================
   START SERVER
===================================================== */

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});