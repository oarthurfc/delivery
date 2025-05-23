import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

class CustomerDeliveryDetailsScreen extends StatefulWidget {
  final Map<String, dynamic> encomenda;

  const CustomerDeliveryDetailsScreen({super.key, required this.encomenda});

  @override
  State<CustomerDeliveryDetailsScreen> createState() => _CustomerDeliveryDetailsScreenState();
}

class _CustomerDeliveryDetailsScreenState extends State<CustomerDeliveryDetailsScreen> {
  bool _isImageExpanded = false;

  String getFormattedAddress(Map<String, dynamic> address) {
    return '${address['street']}, ${address['number']} - ${address['neighborhood']}, ${address['city']}';
  }

  String getFormattedDate(String isoDate) {
    final parts = isoDate.split('-');
    if (parts.length == 3) {
      return '${parts[2]}/${parts[1]}/${parts[0]}'; // DD/MM/YYYY
    }
    return isoDate;
  }

  String getStatusText(String status) {
    switch (status) {
      case 'DELIVERIED':
        return 'Entregue';
      case 'PENDING':
        return 'Em andamento';
      default:
        return status;
    }
  }

  Color getStatusColor(String status) {
    switch (status) {
      case 'DELIVERIED':
        return Colors.green;
      case 'PENDING':
        return Colors.amber;
      default:
        return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final textTheme = theme.textTheme;
    final colorScheme = theme.colorScheme;

    final isDelivered = widget.encomenda['status'] == 'DELIVERIED';
    final statusText = getStatusText(widget.encomenda['status']);
    final statusColor = getStatusColor(widget.encomenda['status']);
    final formattedDate = getFormattedDate(widget.encomenda['data']);

    // Coordenadas da entrega
    final LatLng origem = LatLng(
        widget.encomenda['originAddress']['latitude'],
        widget.encomenda['originAddress']['longitude']
    );

    final LatLng destino = LatLng(
        widget.encomenda['destinationAddress']['latitude'],
        widget.encomenda['destinationAddress']['longitude']
    );

    return Scaffold(
      appBar: AppBar(
        title: const Text('Detalhes da Encomenda'),
        centerTitle: true,
        elevation: 0,
      ),
      body: Column(
        children: [
          // 1. Parte superior fixa (status e data)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
            color: colorScheme.primary.withOpacity(0.05),
            child: Row(
              children: [
                // Status badge
                Expanded(
                  flex: 3,
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 8.0, horizontal: 12.0),
                    decoration: BoxDecoration(
                      color: statusColor.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: statusColor, width: 1),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          isDelivered ? Icons.check_circle : Icons.pending_actions,
                          color: statusColor,
                          size: 18,
                        ),
                        const SizedBox(width: 6),
                        Text(
                          statusText,
                          style: textTheme.bodyMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                            color: statusColor,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                // Data
                Expanded(
                  flex: 2,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Data:',
                        style: textTheme.bodySmall?.copyWith(
                          color: colorScheme.onSurface.withOpacity(0.6),
                        ),
                      ),
                      Text(
                        formattedDate,
                        style: textTheme.bodyMedium?.copyWith(
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // 2. Conteúdo com rolagem
          Expanded(
            child: SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // 3. Mapa (área central, destaque visual)
                  Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Rota no Mapa',
                          style: textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Card(
                          elevation: 4,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(12),
                            child: SizedBox(
                              height: 220,
                              width: double.infinity,
                              child: FlutterMap(
                                options: MapOptions(
                                  center: origem,
                                  zoom: 13.0,
                                  minZoom: 10.0,
                                  maxZoom: 18.0,
                                  interactiveFlags: InteractiveFlag.all,
                                ),
                                children: [
                                  TileLayer(
                                    urlTemplate: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                                    subdomains: ['a', 'b', 'c'],
                                  ),
                                  MarkerLayer(
                                    markers: [
                                      Marker(
                                        point: origem,
                                        width: 60,
                                        height: 60,
                                        child: const Icon(Icons.location_on, color: Colors.blue, size: 32),
                                      ),
                                      Marker(
                                        point: destino,
                                        width: 60,
                                        height: 60,
                                        child: const Icon(Icons.flag, color: Colors.red, size: 32),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),

                  // 4. Informações da entrega
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16.0),
                    child: Card(
                      elevation: 2,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.all(16.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Informações da Entrega',
                              style: textTheme.titleMedium?.copyWith(
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 16),

                            // Origem
                            _buildInfoRow(
                              context,
                              Icons.location_on,
                              'Origem',
                              getFormattedAddress(widget.encomenda['originAddress']),
                              Colors.blue,
                            ),
                            const SizedBox(height: 16),

                            // Destino
                            _buildInfoRow(
                              context,
                              Icons.flag,
                              'Destino',
                              getFormattedAddress(widget.encomenda['destinationAddress']),
                              Colors.red,
                            ),

                            const Padding(
                              padding: EdgeInsets.symmetric(vertical: 16.0),
                              child: Divider(height: 1),
                            ),

                            // Descrição
                            _buildInfoRow(
                              context,
                              Icons.description,
                              'Descrição',
                              widget.encomenda['description'],
                              Colors.grey,
                            ),
                            const SizedBox(height: 16),

                            // Destinatário
                            _buildInfoRow(
                              context,
                              Icons.person,
                              'Destinatário',
                              widget.encomenda['destinatario'],
                              Colors.grey,
                            ),
                            const SizedBox(height: 16),

                            // Valor
                            _buildInfoRow(
                              context,
                              Icons.monetization_on,
                              'Valor',
                              'R\$ ${widget.encomenda['preco'].toStringAsFixed(2)}',
                              Colors.green,
                              isValueField: true,
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),

                  // 5. Imagem do Produto (Expansível)
                  if (widget.encomenda['imageUrl'] != null)
                    Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: _buildExpandableImageSection(context),
                    ),

                  const SizedBox(height: 24),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoRow(
      BuildContext context,
      IconData icon,
      String label,
      String value,
      Color iconColor, {
        bool isValueField = false,
      }) {
    final theme = Theme.of(context);
    final textTheme = theme.textTheme;

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: iconColor.withOpacity(0.1),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(icon, color: iconColor, size: 22),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onSurface.withOpacity(0.6),
                ),
              ),
              const SizedBox(height: 4),
              Text(
                value,
                style: isValueField
                    ? textTheme.bodyMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: Colors.green.shade700,
                )
                    : textTheme.bodyMedium,
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildExpandableImageSection(BuildContext context) {
    final theme = Theme.of(context);
    final textTheme = theme.textTheme;

    final imageUrl = widget.encomenda['imageUrl'];
    final hasValidImageUrl = imageUrl != null && imageUrl.toString().startsWith('http');

    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
      ),
      child: InkWell(
        onTap: () {
          setState(() {
            _isImageExpanded = !_isImageExpanded;
          });
        },
        borderRadius: BorderRadius.circular(12),
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.all(16.0),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: Colors.purple.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Icon(Icons.image, color: Colors.purple, size: 22),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'Ver Imagem do Produto',
                      style: textTheme.bodyMedium?.copyWith(
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                  Icon(
                    _isImageExpanded ? Icons.keyboard_arrow_up : Icons.keyboard_arrow_down,
                    color: theme.colorScheme.onSurface.withOpacity(0.6),
                  ),
                ],
              ),
            ),
            if (_isImageExpanded && hasValidImageUrl)
              GestureDetector(
                onTap: () => _showFullScreenImage(context, imageUrl),
                child: Container(
                  width: double.infinity,
                  constraints: const BoxConstraints(maxHeight: 350),
                  padding: const EdgeInsets.only(bottom: 16.0, left: 16.0, right: 16.0),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: Image.network(
                      imageUrl,
                      fit: BoxFit.contain,
                      errorBuilder: (context, error, stackTrace) =>
                          Center(
                            child: Padding(
                              padding: const EdgeInsets.all(16.0),
                              child: Column(
                                children: [
                                  Icon(Icons.broken_image, color: theme.colorScheme.onSurface.withOpacity(0.6), size: 64),
                                  const SizedBox(height: 16),
                                  Text(
                                    'Não foi possível carregar a imagem',
                                    style: textTheme.bodyMedium?.copyWith(
                                      color: theme.colorScheme.onSurface.withOpacity(0.6),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                      loadingBuilder: (context, child, loadingProgress) {
                        if (loadingProgress == null) {
                          return child;
                        }
                        return Center(
                          child: Padding(
                            padding: const EdgeInsets.symmetric(vertical: 32.0),
                            child: CircularProgressIndicator(
                              value: loadingProgress.expectedTotalBytes != null
                                  ? loadingProgress.cumulativeBytesLoaded /
                                  loadingProgress.expectedTotalBytes!
                                  : null,
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                ),
              ),
            if (_isImageExpanded && !hasValidImageUrl)
              Padding(
                padding: const EdgeInsets.all(16.0),
                child: Center(
                  child: Column(
                    children: [
                      Icon(Icons.image_not_supported, color: theme.colorScheme.onSurface.withOpacity(0.6), size: 64),
                      const SizedBox(height: 16),
                      Text(
                        'Imagem não disponível ou formato inválido',
                        style: textTheme.bodyMedium?.copyWith(
                          color: theme.colorScheme.onSurface.withOpacity(0.6),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  void _showFullScreenImage(BuildContext context, String imageUrl) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => Scaffold(
          appBar: AppBar(
            title: const Text('Visualização da imagem'),
            backgroundColor: Colors.black,
          ),
          backgroundColor: Colors.black,
          body: Center(
            child: InteractiveViewer(
              boundaryMargin: const EdgeInsets.all(20.0),
              minScale: 0.5,
              maxScale: 4.0,
              child: Image.network(
                imageUrl,
                fit: BoxFit.contain,
                errorBuilder: (context, error, stackTrace) =>
                    Icon(Icons.broken_image, color: Theme.of(context).colorScheme.onSurface, size: 100),
              ),
            ),
          ),
        ),
      ),
    );
  }
}