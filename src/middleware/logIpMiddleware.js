// Middleware RGPD pour logging des IPs et activités utilisateur
const fs = require('fs');
const path = require('path');

// Configuration RGPD
const RGPD_CONFIG = {
  logRetentionDays: 30, // Conservation des logs pendant 30 jours
  anonymizeAfterDays: 7, // Anonymisation après 7 jours
  logDirectory: path.join(__dirname, '../logs'),
  enableLogging: process.env.NODE_ENV === 'production'
};

// Fonction pour anonymiser une IP
function anonymizeIP(ip) {
  if (ip.includes(':')) {
    // IPv6 - garder seulement les 4 premiers segments
    return ip.split(':').slice(0, 4).join(':') + '::xxxx';
  } else {
    // IPv4 - masquer le dernier octet
    return ip.split('.').slice(0, 3).join('.') + '.xxx';
  }
}

// Fonction pour créer le répertoire de logs s'il n'existe pas
function ensureLogDirectory() {
  if (!fs.existsSync(RGPD_CONFIG.logDirectory)) {
    fs.mkdirSync(RGPD_CONFIG.logDirectory, { recursive: true });
  }
}

// Fonction pour nettoyer les anciens logs (conformité RGPD)
function cleanupOldLogs() {
  try {
    const files = fs.readdirSync(RGPD_CONFIG.logDirectory);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RGPD_CONFIG.logRetentionDays);

    files.forEach(file => {
      const filePath = path.join(RGPD_CONFIG.logDirectory, file);
      const stats = fs.statSync(filePath);
      
      if (stats.mtime < cutoffDate) {
        fs.unlinkSync(filePath);
        console.log(`🗑️ Log supprimé (RGPD): ${file}`);
      }
    });
  } catch (error) {
    console.error('Erreur lors du nettoyage des logs:', error);
  }
}

// Fonction pour anonymiser les logs anciens
function anonymizeOldLogs() {
  try {
    const files = fs.readdirSync(RGPD_CONFIG.logDirectory);
    const anonymizeDate = new Date();
    anonymizeDate.setDate(anonymizeDate.getDate() - RGPD_CONFIG.anonymizeAfterDays);

    files.forEach(file => {
      const filePath = path.join(RGPD_CONFIG.logDirectory, file);
      const stats = fs.statSync(filePath);
      
      if (stats.mtime < anonymizeDate && !file.includes('_anonymized')) {
        // Lire le fichier et anonymiser les IPs
        const content = fs.readFileSync(filePath, 'utf8');
        const anonymizedContent = content.replace(
          /IP: ([0-9.:a-f]+)/g, 
          (match, ip) => `IP: ${anonymizeIP(ip)}`
        );
        
        // Sauvegarder le fichier anonymisé
        const anonymizedPath = filePath.replace('.log', '_anonymized.log');
        fs.writeFileSync(anonymizedPath, anonymizedContent);
        fs.unlinkSync(filePath); // Supprimer l'original
        
        console.log(`🔒 Log anonymisé (RGPD): ${file}`);
      }
    });
  } catch (error) {
    console.error('Erreur lors de l\'anonymisation des logs:', error);
  }
}

// Middleware principal
function logIpMiddleware(req, res, next) {
  // Skip si logging désactivé
  if (!RGPD_CONFIG.enableLogging) {
    return next();
  }

  try {
    // Récupérer l'IP (avec support des proxies)
    const ip = req.headers['x-forwarded-for'] || 
               req.headers['x-real-ip'] || 
               req.connection.remoteAddress || 
               req.socket.remoteAddress ||
               (req.connection.socket ? req.connection.socket.remoteAddress : null);

    const userAgent = req.headers['user-agent'] || 'inconnu';
    const timestamp = new Date().toISOString();
    const method = req.method;
    const url = req.originalUrl || req.url;
    const referer = req.headers.referer || 'direct';

    // Créer l'entrée de log conforme RGPD
    const logEntry = {
      timestamp,
      ip: ip || 'unknown',
      method,
      url,
      userAgent,
      referer,
      sessionId: req.sessionID || 'no-session',
      // Ajouter des métadonnées pour la conformité RGPD
      rgpd: {
        purpose: 'security_monitoring', // Finalité du traitement
        retention: `${RGPD_CONFIG.logRetentionDays}d`, // Durée de conservation
        anonymization: `${RGPD_CONFIG.anonymizeAfterDays}d` // Délai d'anonymisation
      }
    };

    // Préparer le répertoire de logs
    ensureLogDirectory();

    // Nom du fichier de log basé sur la date
    const logFileName = `access_${new Date().toISOString().split('T')[0]}.log`;
    const logFilePath = path.join(RGPD_CONFIG.logDirectory, logFileName);

    // Écrire dans le fichier de log
    const logLine = JSON.stringify(logEntry) + '\n';
    fs.appendFileSync(logFilePath, logLine);

    // Log dans la console pour le développement
    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 [${timestamp}] ${method} ${url} | IP: ${ip} | UA: ${userAgent.substring(0, 50)}...`);
    }

    // Nettoyage périodique (1 fois par jour)
    if (Math.random() < 0.01) { // 1% de chance à chaque requête
      setTimeout(() => {
        cleanupOldLogs();
        anonymizeOldLogs();
      }, 1000); // Délai pour ne pas bloquer la requête
    }

    // Ajouter des headers de conformité RGPD
    res.setHeader('X-Data-Processing', 'logs-security-monitoring');
    res.setHeader('X-Data-Retention', `${RGPD_CONFIG.logRetentionDays}d`);

  } catch (error) {
    console.error('Erreur dans le middleware de logging:', error);
    // Ne pas faire échouer la requête en cas d'erreur de logging
  }

  next();
}

// Fonction utilitaire pour obtenir les statistiques de logs
function getLogStats() {
  try {
    ensureLogDirectory();
    const files = fs.readdirSync(RGPD_CONFIG.logDirectory);
    
    let totalEntries = 0;
    let anonymizedFiles = 0;
    
    files.forEach(file => {
      if (file.includes('_anonymized')) {
        anonymizedFiles++;
      }
      
      const filePath = path.join(RGPD_CONFIG.logDirectory, file);
      const content = fs.readFileSync(filePath, 'utf8');
      totalEntries += content.split('\n').filter(line => line.trim()).length;
    });

    return {
      totalFiles: files.length,
      totalEntries,
      anonymizedFiles,
      retentionDays: RGPD_CONFIG.logRetentionDays,
      anonymizationDays: RGPD_CONFIG.anonymizeAfterDays
    };
  } catch (error) {
    console.error('Erreur lors de la récupération des stats de logs:', error);
    return null;
  }
}

// Fonction pour exporter les logs d'un utilisateur (droit RGPD)
function exportUserLogs(userIP) {
  try {
    ensureLogDirectory();
    const files = fs.readdirSync(RGPD_CONFIG.logDirectory);
    const userLogs = [];

    files.forEach(file => {
      const filePath = path.join(RGPD_CONFIG.logDirectory, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n').filter(line => line.trim());
      
      lines.forEach(line => {
        try {
          const logEntry = JSON.parse(line);
          if (logEntry.ip === userIP) {
            userLogs.push(logEntry);
          }
        } catch (parseError) {
          // Ignorer les lignes mal formatées
        }
      });
    });

    return userLogs;
  } catch (error) {
    console.error('Erreur lors de l\'export des logs utilisateur:', error);
    return [];
  }
}

module.exports = {
  logIpMiddleware,
  getLogStats,
  exportUserLogs,
  cleanupOldLogs,
  anonymizeOldLogs,
  RGPD_CONFIG
};