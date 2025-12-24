class QualityService {
  constructor(qualityRepository) {
    this.qualityRepository = qualityRepository;
  }

  async getAllQualities() {
    return await this.qualityRepository.getAll();
  }

  async addQuality(name) {
    if (!name || !name.trim()) {
      throw new Error("Quality name is required");
    }
    const trimmedName = name.trim();
    return await this.qualityRepository.create(trimmedName);
  }

  async getOrCreateQuality(name) {
    if (!name || !name.trim()) {
      return null;
    }
    const trimmedName = name.trim();
    const existing = await this.qualityRepository.findByName(trimmedName);
    if (existing) {
      return existing.id;
    }
    return await this.qualityRepository.create(trimmedName);
  }
}

module.exports = QualityService;

