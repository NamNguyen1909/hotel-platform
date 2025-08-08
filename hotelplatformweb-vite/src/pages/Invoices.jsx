import React, { useState, useEffect } from 'react';
import {
  Container, Box, Typography, TextField, InputAdornment,
  Select, MenuItem, FormControl, InputLabel, Card, CardContent, Chip, Button, Grid, Skeleton, Alert, Pagination
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import { useNavigate } from 'react-router-dom';
import api from '../services/apis';
import { endpoints } from '../services/apis';

const Invoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const itemsPerPage = 6;
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await api.get(endpoints.invoices.list);
        setInvoices(res.data);
        setError(null);
      } catch {
        setError('Không thể tải dữ liệu. Vui lòng thử lại.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = invoices
    .filter(inv => inv.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
                   inv.id.toString().includes(search))
    .filter(inv => statusFilter === 'all' ||
           (statusFilter === 'paid' ? inv.status : !inv.status));

  const pageItems = filtered.slice((page-1)*itemsPerPage, page*itemsPerPage);

  return (
    <Box sx={{ py: 8, backgroundColor: 'grey.100', minHeight: '100vh' }}>
      <Container maxWidth="lg">
        <Typography variant="h4" align="center" sx={{ mb: 4 }}>
          Danh sách Hóa Đơn
        </Typography>

        <Box sx={{
          display: 'flex', flexWrap: 'wrap', gap: 2, mb: 4,
          alignItems: 'center', justifyContent: 'space-between'
        }}>
          <TextField
            variant="outlined"
            placeholder="Tìm kiếm theo tên hoặc ID"
            value={search}
            onChange={e => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ flex: 1, minWidth: 240 }}
          />

          <FormControl variant="outlined" sx={{ width: 160 }}>
            <InputLabel>Trạng thái</InputLabel>
            <Select
              label="Trạng thái"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <MenuItem value="all">Tất cả</MenuItem>
              <MenuItem value="paid">Đã thanh toán</MenuItem>
              <MenuItem value="unpaid">Chưa thanh toán</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {loading ? (
          <Grid container spacing={3}>
            {[...Array(itemsPerPage)].map((_, i) => (
              <Grid key={i} item xs={12} sm={6} md={4}>
                <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
              </Grid>
            ))}
          </Grid>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : filtered.length === 0 ? (
          <Alert severity="info">Không có hóa đơn phù hợp.</Alert>
        ) : (
          <>
            <Grid container spacing={3}>
              {pageItems.map(inv => (
                <Grid key={inv.id} item xs={12} sm={6} md={4}>
                  <Card sx={{ borderRadius: 2, height: '100%' }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <ReceiptLongIcon fontSize="large" color="primary" sx={{ mr: 1 }} />
                        <Typography variant="h6">
                          Hóa đơn #{inv.id}
                        </Typography>
                        <Chip
                          label={inv.status ? 'Đã thanh toán' : 'Chưa thanh toán'}
                          color={inv.status ? 'success' : 'warning'}
                          size="small"
                          sx={{ ml: 'auto' }}
                        />
                      </Box>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        Khách hàng: <strong>{inv.customer_name || 'N/A'}</strong>
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        Số tiền: <strong>{inv.amount ? Number(inv.amount).toLocaleString('vi-VN') : 'N/A'} VND</strong>
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 2 }}>
                        Ngày: {inv.created_at ? new Date(inv.created_at).toLocaleDateString('vi-VN') : '–'}
                      </Typography>
                      <Button
                        variant="outlined"
                        fullWidth
                        onClick={() => navigate(`/invoice/${inv.id}`)}
                      >
                        Xem chi tiết
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
              <Pagination
                count={Math.ceil(filtered.length / itemsPerPage)}
                page={page}
                onChange={(_, v) => setPage(v)}
                color="primary"
                shape="rounded"
              />
            </Box>
          </>
        )}
      </Container>
    </Box>
  );
};

export default Invoices;