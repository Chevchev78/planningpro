# PlanningPro

Calendrier pour les cycles de travail non hebdomadaires (4/2, 3/3, 2/2/2…).
Configurez votre roulement une fois et voyez d'un coup d'œil comment vous travaillez n'importe quel jour.

**➜ https://chevchev78.github.io/planningpro/**

## Fonctions

- Trois onglets : Planning, Cycle, Réglages
- Carte du jour : poste, position dans le cycle, lendemain et prochaine reprise
- Cycle de 1 à 60 jours : matin, après-midi, soirée, nuit, journée ou repos, avec modèles 2/2, 3/3, 4/2, 4/4, 5/2
- Calendrier mensuel coloré, swipe entre les mois
- Note et jour de congé pour chaque date
- Compteur du mois (jours travaillés, nuits, repos, congés…)
- Mode sombre et couleurs personnalisables
- Export / import des données
- Installable sur l'écran d'accueil et utilisable hors-ligne

Sur iPhone : ouvrir le lien dans Safari → Partager → **Sur l'écran d'accueil**.

## Données

Tout est enregistré dans le navigateur (`localStorage`) : aucun compte, aucun serveur.

## Développement

Site statique en HTML, CSS et JavaScript (modules ES), sans dépendance ni étape de build.
Servez le dossier avec n'importe quel serveur statique, par exemple :

```bash
npx serve .
```

À chaque mise en ligne, incrémentez `CACHE` dans `sw.js` pour que les appareils récupèrent la nouvelle version.
