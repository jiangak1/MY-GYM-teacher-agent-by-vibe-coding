-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "UserProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "gender" TEXT NOT NULL,
    "heightCm" REAL NOT NULL,
    "currentWeightKg" REAL NOT NULL,
    "targetWeightKg" REAL NOT NULL,
    "hasTrainingExperience" BOOLEAN NOT NULL,
    "weeklyTrainingDays" INTEGER NOT NULL,
    "cardioMinutesPerWeek" INTEGER NOT NULL,
    "sleepHoursPerNight" REAL NOT NULL,
    "dietStyle" TEXT NOT NULL,
    "activityLevel" TEXT NOT NULL,
    "bmi" REAL,
    "bmr" REAL,
    "tdee" REAL,
    "bodyFatPercentage" REAL,
    "ffmi" REAL,
    "obesityLevel" TEXT,
    "metabolicLevel" TEXT,
    "trainingExperience" TEXT,
    "fatLossPhase" TEXT,
    "onboardingComplete" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DailyHealth" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "steps" INTEGER NOT NULL DEFAULT 0,
    "walkingDistanceM" REAL NOT NULL DEFAULT 0,
    "activeCalories" REAL NOT NULL DEFAULT 0,
    "exerciseMinutes" INTEGER NOT NULL DEFAULT 0,
    "sleepDurationMin" INTEGER NOT NULL DEFAULT 0,
    "sleepQuality" TEXT NOT NULL DEFAULT 'fair',
    "hrv" REAL NOT NULL DEFAULT 0,
    "heartRate" REAL NOT NULL DEFAULT 0,
    "weightKg" REAL NOT NULL DEFAULT 0,
    "caloriesConsumed" REAL NOT NULL DEFAULT 0,
    "proteinG" REAL NOT NULL DEFAULT 0,
    "carbsG" REAL NOT NULL DEFAULT 0,
    "fatG" REAL NOT NULL DEFAULT 0,
    "recoveryScore" INTEGER,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DailyHealth_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WorkoutLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "workoutType" TEXT NOT NULL,
    "durationMin" INTEGER NOT NULL,
    "caloriesBurned" REAL NOT NULL,
    "exercises" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkoutLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NutritionLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "mealType" TEXT NOT NULL,
    "foodName" TEXT NOT NULL,
    "servingSizeG" REAL NOT NULL,
    "calories" REAL NOT NULL,
    "proteinG" REAL NOT NULL,
    "carbsG" REAL NOT NULL,
    "fatG" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NutritionLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CarbonCyclePlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT NOT NULL,
    "days" TEXT NOT NULL,
    "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,
    CONSTRAINT "CarbonCyclePlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AIHealthMemory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "confidence" REAL NOT NULL DEFAULT 1.0,
    "lastUpdated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AIHealthMemory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AIConversation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "toolCalls" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AIConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProviderSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "chatProvider" TEXT NOT NULL DEFAULT 'claude',
    "chatModel" TEXT NOT NULL DEFAULT 'claude-sonnet-4-6',
    "sttProvider" TEXT NOT NULL DEFAULT 'faster_whisper',
    "ttsProvider" TEXT NOT NULL DEFAULT 'mimo_v2.5',
    "encryptedApiKeys" TEXT NOT NULL DEFAULT '{}',
    "theme" TEXT NOT NULL DEFAULT 'dark',
    "language" TEXT NOT NULL DEFAULT 'zh-CN',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProviderSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_userId_key" ON "UserProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyHealth_userId_date_key" ON "DailyHealth"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "AIHealthMemory_userId_category_key_key" ON "AIHealthMemory"("userId", "category", "key");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderSettings_userId_key" ON "ProviderSettings"("userId");
