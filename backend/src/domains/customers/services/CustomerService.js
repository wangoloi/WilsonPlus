class CustomerService {
  constructor(customerRepository) {
    this.customerRepository = customerRepository;
  }

  async getAllCustomers() {
    return await this.customerRepository.getAll();
  }

  async addCustomer(name) {
    if (!name || !name.trim()) {
      throw new Error("Customer name is required");
    }
    const trimmedName = name.trim();
    return await this.customerRepository.create(trimmedName);
  }

  async getOrCreateCustomer(name) {
    if (!name || !name.trim()) {
      return null;
    }
    const trimmedName = name.trim();
    const existing = await this.customerRepository.findByName(trimmedName);
    if (existing) {
      return existing.id;
    }
    return await this.customerRepository.create(trimmedName);
  }
}

module.exports = CustomerService;

